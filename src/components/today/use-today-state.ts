import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserLocation, loadSavedLocation, requestPreciseLocation, saveLocation, DEFAULT_LOCATION, type GeoLocation } from "@/lib/geo";
import { fetchWeather } from "@/lib/weather";
import { fetchAirQuality } from "@/lib/air-quality";
import {
  loadDist, loadEffort, loadPaces, loadRunsHot, loadUnits,
  saveDist, saveEffort, savePaces, saveRunsHot, saveUnits, type EffortLevel, type UserPaces,
} from "@/lib/state";
import { computeBestWindow, computeForHour, computeHourScores, getFeedbackContext } from "@/lib/compute";
import { getDayLabel, localDateStr } from "@/lib/display";
import { hasFeedbackToday } from "@/lib/feedback";
import { bandsAhead, defaultHourIndex } from "@/lib/today/model";
import { parseTodayUrl, serializeTodayUrl, type SheetId, type TodayUrlState } from "@/lib/today/url";
import { readCachedForecast, readLastForecast, writeCachedForecast } from "@/lib/today/cache";
import type { Prefs, ThemeChoice, TodayActions, TodayView } from "./today-context";
import { notify } from "./notify";

/** Illustrative paces for the hub preview, so lanes show adjusted times; labelled as samples. */
const EMBED_PACES: UserPaces = { easy: 510, endurance: 480, tempo: 435, threshold: 415, interval: 385 };
const THEME_KEY = "runcast-theme";
const FORECAST_STALE_MS = 10 * 60 * 1000;

type Forecast = { weather: Awaited<ReturnType<typeof fetchWeather>>; airQuality: Awaited<ReturnType<typeof fetchAirQuality>> | null };

function readTheme(): ThemeChoice {
  const v = localStorage.getItem(THEME_KEY);
  return v === "dark" || v === "light" ? v : "system";
}

/** First-paint location: saved choice, else the place of the last cached forecast. */
function initialLocation(embed: boolean): GeoLocation | undefined {
  if (embed) return DEFAULT_LOCATION;
  const saved = loadSavedLocation();
  if (saved) return saved;
  const last = readLastForecast(localStorage, Date.now());
  return last ? { latitude: last.lat, longitude: last.lng, name: last.name, source: "ip" } : undefined;
}

function initialPrefs(embed: boolean): Prefs {
  if (embed) return { paces: { ...EMBED_PACES }, effort: "easy", runsHot: false, celsius: false, metric: false };
  return { paces: loadPaces(), effort: loadEffort(), runsHot: loadRunsHot(), celsius: loadUnits(), metric: loadDist() };
}

export type TodayState =
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; view: TodayView; actions: TodayActions };

export function useTodayState(embed: boolean): TodayState {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<Prefs>(() => initialPrefs(embed));
  const [url, setUrl] = useState<TodayUrlState>(() => (embed ? { day: null, hour: null, sheet: null } : parseTodayUrl(location.search)));
  const [theme, setThemeState] = useState<ThemeChoice>(() => (embed ? "system" : readTheme()));
  const [logged, setLogged] = useState(() => !embed && hasFeedbackToday());

  // Back/forward restores the day, hour and open sheet from the URL.
  useEffect(() => {
    if (embed) return;
    const onPop = () => setUrl(parseTodayUrl(location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [embed]);

  const seed = initialLocation(embed);
  const locationQuery = useQuery({
    queryKey: ["location"],
    queryFn: getUserLocation,
    initialData: seed,
    // A saved choice is authoritative; an inferred place is re-checked in the background.
    staleTime: seed?.source === "saved" || embed ? Infinity : 0,
    enabled: !embed,
  });
  const loc = locationQuery.data;

  const forecastQuery = useQuery<Forecast>({
    queryKey: ["forecast", loc ? loc.latitude.toFixed(2) : null, loc ? loc.longitude.toFixed(2) : null],
    enabled: Boolean(loc),
    staleTime: FORECAST_STALE_MS,
    placeholderData: keepPreviousData,
    initialData: () => {
      if (!loc) return undefined;
      const c = readCachedForecast(localStorage, { lat: loc.latitude, lng: loc.longitude }, Date.now());
      return c ? { weather: c.weather, airQuality: c.airQuality } : undefined;
    },
    initialDataUpdatedAt: () => {
      if (!loc) return undefined;
      return readCachedForecast(localStorage, { lat: loc.latitude, lng: loc.longitude }, Date.now())?.savedAt;
    },
    queryFn: async () => {
      if (!loc) throw new Error("No location");
      const [weather, airQuality] = await Promise.all([
        fetchWeather(loc.latitude, loc.longitude),
        fetchAirQuality(loc.latitude, loc.longitude).catch(() => null),
      ]);
      if (!embed) {
        writeCachedForecast(localStorage, { lat: loc.latitude, lng: loc.longitude, name: loc.name, savedAt: Date.now(), weather, airQuality });
      }
      return { weather, airQuality };
    },
  });

  // ─── URL-synced selection ────────────────────────────────────────────────
  function commitUrl(next: TodayUrlState, mode: "push" | "replace"): void {
    setUrl(next);
    if (embed) return;
    const href = `${location.pathname}${serializeTodayUrl(location.search, next)}${location.hash}`;
    if (mode === "push") history.pushState({ runcastSheet: next.sheet }, "", href);
    else history.replaceState(history.state, "", href);
  }

  const forecast = forecastQuery.data;
  if (!loc || !forecast) {
    if (forecastQuery.isError || locationQuery.isError) {
      const message = (forecastQuery.error ?? locationQuery.error)?.message ?? "Something went wrong";
      return { status: "error", message, retry: () => void queryClient.invalidateQueries() };
    }
    return { status: "loading" };
  }

  // ─── Derived view ────────────────────────────────────────────────────────
  const now = new Date();
  const todayStr = localDateStr(now);
  const { weather, airQuality } = forecast;
  const days = weather.dailyAll.filter((d) => d.date >= todayStr);
  const day = url.day && days.some((d) => d.date === url.day) ? url.day : todayStr;
  const hours = weather.hourly.filter((h) => h.time.startsWith(day));
  const bwParams = { weather, selectedDayDate: day, availableDays: days, useCelsius: prefs.celsius };
  const bw = computeBestWindow(bwParams);
  const fromUrl = url.hour === null ? -1 : hours.findIndex((h) => new Date(h.time).getHours() === url.hour);
  const hourIndex = fromUrl !== -1 ? fromUrl : defaultHourIndex(hours, bw.startHour, day === todayStr, now);
  const hour = hours[hourIndex];
  if (!hour) return { status: "error", message: "No forecast hours for this day", retry: () => void queryClient.invalidateQueries() };

  const b = computeForHour({
    hour, weather, airQuality, paces: prefs.paces, selectedEffort: prefs.effort, runsHot: prefs.runsHot,
    selectedDayDate: day, availableDays: days, useCelsius: prefs.celsius, useMetric: prefs.metric,
  });

  const view: TodayView = {
    embed,
    location: loc,
    approximate: loc.source === "ip" || loc.source === "default",
    updating: forecastQuery.isFetching || forecastQuery.isPlaceholderData,
    days,
    day,
    dayLabel: getDayLabel(day),
    hours,
    hourIndex,
    isBestHour: hour.time === bw.startHour,
    b,
    bw,
    bands: bandsAhead(computeHourScores(bwParams), now),
    prefs,
    sheet: url.sheet,
    logged,
    feedbackContext: getFeedbackContext(bwParams, loc.name, loc.latitude, loc.longitude, prefs.effort, prefs.runsHot, prefs.paces[prefs.effort] || 0),
  };

  // ─── Actions ─────────────────────────────────────────────────────────────
  const updatePrefs = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch }));

  const actions: TodayActions = {
    selectDay: (d) => commitUrl({ ...url, day: d === todayStr ? null : d, hour: null }, "replace"),
    selectHour: (i) => {
      const h = hours[i];
      if (!h) return;
      const isDefault = i === defaultHourIndex(hours, bw.startHour, day === todayStr, now);
      commitUrl({ ...url, hour: isDefault ? null : new Date(h.time).getHours() }, "replace");
    },
    selectEffort: (effort: EffortLevel) => {
      if (!embed) saveEffort(effort);
      updatePrefs({ effort });
    },
    openSheet: (id: SheetId) => {
      if (embed || url.sheet === id) return;
      commitUrl({ ...url, sheet: id }, url.sheet ? "replace" : "push");
    },
    closeSheet: () => {
      if (!url.sheet) return;
      // Pop the entry the sheet pushed so Back and the close button agree.
      if (history.state?.runcastSheet) history.back();
      else commitUrl({ ...url, sheet: null }, "replace");
    },
    savePaces: (paces) => {
      savePaces(paces);
      updatePrefs({ paces });
    },
    setRunsHot: (runsHot) => {
      saveRunsHot(runsHot);
      updatePrefs({ runsHot });
    },
    setUnits: ({ celsius, metric }) => {
      if (celsius !== undefined) saveUnits(celsius);
      if (metric !== undefined) saveDist(metric);
      updatePrefs({ ...(celsius !== undefined && { celsius }), ...(metric !== undefined && { metric }) });
    },
    setTheme: (choice) => {
      if (choice === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, choice);
      const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
      setThemeState(choice);
    },
    theme,
    changeLocation: (next) => {
      saveLocation(next);
      queryClient.setQueryData(["location"], next);
      actions.closeSheet();
      notify("success", `Showing ${next.name}`);
    },
    usePreciseLocation: async () => {
      try {
        const next = await requestPreciseLocation();
        actions.changeLocation({ ...next, source: "saved" });
      } catch {
        notify("error", "Couldn't get your location", "Location access is off for this site. Search for your city instead.");
      }
    },
    markLogged: () => setLogged(true),
    notify,
  };

  return { status: "ready", view, actions };
}

