/**
 * RunCast — Stateful interactive app.
 * Multi-day, multi-pace, safety alerts, detail card, interactive timeline.
 */
import { getUserLocation, type GeoLocation } from "./geo";
import { fetchWeather, type WeatherData, type HourlyWeather, type DailyWeather } from "./weather";
import { fetchAirQuality, type AirQualityData, getAQICategory } from "./air-quality";
import { windChillF } from "./formulas/wind-chill";
import { getHeatPaceAdjustment, getColdPaceAdjustment, formatPace, adjustPace, windImpactSeconds } from "./formulas/pace";
import { getIceRisk, type IceRiskResult } from "./formulas/ice-risk";
import { findBestWindow, type HourlyConditions, type BestWindowResult } from "./formulas/best-window";
import { getClothingRec, getRunnerFeelsLike, type ClothingRec } from "./formulas/clothing";
import { suggestRunType, type RunTypeResult } from "./formulas/run-type";
import { formatTime } from "./formulas/daylight";
import { getSafetyAlerts, findNextPrecip, findNextThunderstorm, getRecentPrecipSum, type SafetyAlert } from "./formulas/safety";
import { getConditionIcon, getConditionLabel, chevronLeft, chevronRight, settingsIcon, ALERT_STYLES } from "./icons";
import {
  hasFeedbackToday, isFeedbackDismissedToday,
  renderFeedback, handleFeedbackAction,
  type FeedbackBriefing, type FeedbackContext,
} from "./feedback";
import { syncFeedback } from "./sync";

// ─── Types ───────────────────────────────────────────────────────────────────
type EffortLevel = "easy" | "endurance" | "tempo" | "threshold" | "interval";

interface UserPaces {
  easy: number;
  endurance: number;
  tempo: number;
  threshold: number;
  interval: number;
}

interface AppState {
  weather: WeatherData;
  airQuality: AirQualityData | null;
  locationName: string;
  lat: number | null;
  lng: number | null;
  // Day
  selectedDayDate: string; // YYYY-MM-DD
  availableDays: DailyWeather[];
  // Hour
  displayHours: HourlyWeather[];
  selectedHourIndex: number;
  timelineOffset: number;
  // Preferences
  paces: UserPaces;
  selectedEffort: EffortLevel;
  runsHot: boolean;
  useCelsius: boolean;
  useMetric: boolean;
  settingsOpen: boolean;
  alertsExpanded: boolean;
  // Feedback (3-tap flow: clothing + effort + shoes)
  feedbackClothing: string | null;
  feedbackEffortLevel: string | null;
  feedbackShoes: string | null;
  feedbackShoesOther: boolean;
  feedbackOpen: boolean;
  feedbackSubmitted: boolean;
}

interface HourBriefing {
  hour: HourlyWeather;
  daily: DailyWeather;
  paceAdjustment: { min: number; max: number; warning?: string; type: "heat" | "cold" };
  adjustedPaces: { effort: EffortLevel; label: string; base: string; adjusted: string }[];
  windChill: number;
  iceRisk: IceRiskResult;
  clothing: ClothingRec;
  runType: RunTypeResult;
  daylight: { sunrise: string; sunset: string; message: string | null };
  aqiForHour: number | undefined;
  aqiCategory: string;
  safetyAlerts: SafetyAlert[];
  nextRain: { time: string; prob: number } | null;
  nextThunderstorm: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const LS_PACES = "runcast-paces";
const LS_RUNS_HOT = "runcast-runs-hot";
const LS_EFFORT = "runcast-effort";
const LS_UNITS = "runcast-units";
const LS_DIST = "runcast-dist";
const TIMELINE_VISIBLE = 8;

const EFFORT_LABELS: Record<EffortLevel, string> = {
  easy: "Easy", endurance: "Endurance", tempo: "Tempo",
  threshold: "Threshold", interval: "Interval",
};
const EFFORT_HEAT_OFFSET: Record<EffortLevel, number> = {
  easy: 15, endurance: 17, tempo: 20, threshold: 22, interval: 25,
};
const EFFORTS: EffortLevel[] = ["easy", "endurance", "tempo", "threshold", "interval"];
const EMPTY_PACES: UserPaces = { easy: 0, endurance: 0, tempo: 0, threshold: 0, interval: 0 };

// ─── State ───────────────────────────────────────────────────────────────────
let state: AppState;
let eventsBound = false;

// ─── Entry Point ─────────────────────────────────────────────────────────────
export async function initApp(): Promise<void> {
  try {
    // Reuse the location promise from Header.astro (avoids double geolocation prompt)
    const location = (window as any).__runcastLocationPromise
      ? await (window as any).__runcastLocationPromise
      : await getUserLocation();

    const [weather, airQuality] = await Promise.all([
      fetchWeather(location.latitude, location.longitude),
      fetchAirQuality(location.latitude, location.longitude).catch(() => null),
    ]);

    const todayStr = localDateStr(new Date());
    // Available days = today onwards (skip yesterday from past_days=1)
    const availableDays = weather.dailyAll.filter(d => d.date >= todayStr);
    const displayHours = weather.hourly.filter(h => h.time.startsWith(todayStr));

    // Find current hour — use local time matching, not UTC ISO
    const nowHour = new Date().getHours();
    let selectedIdx = displayHours.findIndex(h => new Date(h.time).getHours() === nowHour);
    if (selectedIdx === -1) selectedIdx = Math.max(0, displayHours.length - 1);

    const offset = Math.max(0, Math.min(
      selectedIdx - Math.floor(TIMELINE_VISIBLE / 2),
      displayHours.length - TIMELINE_VISIBLE
    ));

    state = {
      weather, airQuality, locationName: location.name,
      lat: location.latitude, lng: location.longitude,
      selectedDayDate: todayStr,
      availableDays,
      displayHours,
      selectedHourIndex: selectedIdx,
      timelineOffset: Math.max(0, offset),
      paces: loadPaces(),
      selectedEffort: loadEffort(),
      runsHot: loadRunsHot(),
      useCelsius: loadUnits(),
      useMetric: loadDist(),
      settingsOpen: false,
      alertsExpanded: false,
      feedbackClothing: null,
      feedbackEffortLevel: null,
      feedbackShoes: null,
      feedbackShoesOther: false,
      feedbackOpen: false,
      feedbackSubmitted: hasFeedbackToday() || isFeedbackDismissedToday(),
    };

    render();

    // Sync any unsynced feedback entries on startup
    syncFeedback();

    // Listen for location changes dispatched by Header.astro's search dropdown
    window.addEventListener("runcast:location-change", ((e: CustomEvent<GeoLocation>) => {
      changeLocation(e.detail);
    }) as EventListener);

    // Listen for unit toggle changes dispatched by Header.astro's popover
    window.addEventListener("runcast:units-change", () => {
      state.useCelsius = loadUnits();
      state.useMetric = loadDist();
      render();
    });

    // Listen for "Log Run" button in Header
    window.addEventListener("runcast:open-feedback", () => {
      if (!state.feedbackSubmitted) {
        state.feedbackOpen = true;
        render();
      }
    });

    // Sync feedback after submission
    window.addEventListener("runcast:feedback-submitted", () => {
      syncFeedback();
    });
  } catch (err) {
    renderError(err instanceof Error ? err.message : "Something went wrong");
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esc(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function parsePace(val: string): number {
  const v = val.trim();
  // Accept "7:00" or "700" or "1700" — insert colon if missing
  const m = v.match(/^(\d{1,2}):(\d{2})$/) || v.match(/^(\d{1,2})(\d{2})$/);
  if (!m) return 0;
  const min = parseInt(m[1], 10), sec = parseInt(m[2], 10);
  if (sec >= 60 || min < 4 || min > 20) return 0;
  return min * 60 + sec;
}

function getDayLabel(dateStr: string): string {
  const today = localDateStr(new Date());
  if (dateStr === today) return "Today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === localDateStr(tomorrow)) return "Tomorrow";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
}

// ─── localStorage ────────────────────────────────────────────────────────────
function loadPaces(): UserPaces {
  try {
    const s = localStorage.getItem(LS_PACES);
    if (s) return { ...EMPTY_PACES, ...JSON.parse(s) };
  } catch { /* ignore */ }
  // Migrate old single-pace format
  const old = localStorage.getItem("runcast-base-pace");
  if (old) {
    const p = { ...EMPTY_PACES, easy: parseInt(old, 10) };
    localStorage.removeItem("runcast-base-pace");
    savePaces(p);
    return p;
  }
  return { ...EMPTY_PACES };
}
function savePaces(p: UserPaces): void { localStorage.setItem(LS_PACES, JSON.stringify(p)); }
function loadRunsHot(): boolean { return localStorage.getItem(LS_RUNS_HOT) === "true"; }
function saveRunsHot(v: boolean): void { localStorage.setItem(LS_RUNS_HOT, v ? "true" : "false"); }
function loadEffort(): EffortLevel {
  const v = localStorage.getItem(LS_EFFORT);
  return EFFORTS.includes(v as EffortLevel) ? v as EffortLevel : "easy";
}
function saveEffort(e: EffortLevel): void { localStorage.setItem(LS_EFFORT, e); }
function loadUnits(): boolean { return localStorage.getItem(LS_UNITS) === "C"; }
function saveUnits(celsius: boolean): void { localStorage.setItem(LS_UNITS, celsius ? "C" : "F"); }
function loadDist(): boolean { return localStorage.getItem(LS_DIST) === "metric"; }
function saveDist(v: boolean): void { localStorage.setItem(LS_DIST, v ? "metric" : "imperial"); }

function tempDisplay(f: number): string {
  if (state.useCelsius) return `${Math.round((f - 32) * 5 / 9)}°C`;
  return `${Math.round(f)}°F`;
}
function tempDeltaDisplay(fDelta: number): string {
  if (state.useCelsius) return `${Math.round(fDelta * 5 / 9)}°`;
  return `${fDelta}°`;
}
function tempUnit(): string { return state.useCelsius ? "°C" : "°F"; }
function speedDisplay(mph: number): string {
  if (state.useMetric) return `${Math.round(mph * 1.609)} km/h`;
  return `${Math.round(mph)} mph`;
}
function distDisplay(miles: number, decimals = 1): string {
  if (state.useMetric) return `${(miles * 1.609).toFixed(decimals)} km`;
  return `${miles.toFixed(decimals)} mi`;
}
function paceForDisplay(secPerMile: number): number {
  return state.useMetric ? secPerMile / 1.609344 : secPerMile;
}
function paceUnit(): string { return state.useMetric ? "/km" : "/mi"; }

// ─── Day/Hour Management ─────────────────────────────────────────────────────
function switchDay(dateStr: string): void {
  state.selectedDayDate = dateStr;
  state.displayHours = state.weather.hourly.filter(h => h.time.startsWith(dateStr));

  const today = localDateStr(new Date());
  if (dateStr === today) {
    const nowHour = new Date().getHours();
    state.selectedHourIndex = state.displayHours.findIndex(h => new Date(h.time).getHours() === nowHour);
    if (state.selectedHourIndex === -1) state.selectedHourIndex = 0;
  } else {
    // Default to ~8am for future days, or first hour
    state.selectedHourIndex = state.displayHours.findIndex(h => new Date(h.time).getHours() >= 8);
    if (state.selectedHourIndex === -1) state.selectedHourIndex = 0;
  }

  state.timelineOffset = Math.max(0, Math.min(
    state.selectedHourIndex - Math.floor(TIMELINE_VISIBLE / 2),
    state.displayHours.length - TIMELINE_VISIBLE
  ));
  state.alertsExpanded = false;
  render();
}

// ─── Compute ─────────────────────────────────────────────────────────────────
function computeForHour(hour: HourlyWeather): HourBriefing {
  const { weather, airQuality, paces, selectedEffort } = state;
  const daily = state.availableDays.find(d => d.date === state.selectedDayDate) || state.weather.daily;
  const now = new Date();

  // Wind chill
  const wc = windChillF(hour.temperature, hour.windSpeed);

  // Pace adjustment
  const isHeat = hour.temperature > 55;
  const paceAdj = isHeat
    ? { ...getHeatPaceAdjustment(hour.temperature, hour.dewPoint), type: "heat" as const }
    : { ...getColdPaceAdjustment(wc), type: "cold" as const };

  // Adjusted paces for all set effort levels
  const adjustedPaces: HourBriefing["adjustedPaces"] = [];
  for (const effort of EFFORTS) {
    const base = paces[effort];
    if (base > 0) {
      const minAdj = adjustPace(base, paceAdj.min);
      const maxAdj = paceAdj.max === Infinity ? 0 : adjustPace(base, paceAdj.max);
      adjustedPaces.push({
        effort,
        label: EFFORT_LABELS[effort],
        base: formatPace(paceForDisplay(base)),
        adjusted: paceAdj.min === 0 && paceAdj.max === 0
          ? formatPace(paceForDisplay(base))
          : maxAdj > 0 ? `${formatPace(paceForDisplay(minAdj))}–${formatPace(paceForDisplay(maxAdj))}` : `${formatPace(paceForDisplay(minAdj))}+`,
      });
    }
  }

  // Ice risk
  const past24h = weather.hourly.filter(h => {
    const t = new Date(h.time);
    return t < now && t > new Date(now.getTime() - 86400000);
  });
  const tempMin24h = past24h.length > 0 ? Math.min(...past24h.map(h => h.temperature)) : hour.temperature;
  const tempMax24h = past24h.length > 0 ? Math.max(...past24h.map(h => h.temperature)) : hour.temperature;
  const precip24h = past24h.reduce((sum, h) => sum + h.precipitation, 0);
  const isEarlyMorning = new Date(hour.time).getHours() < 8;

  const iceRisk = getIceRisk(
    { tempF: hour.temperature, dewPointF: hour.dewPoint, windMph: hour.windSpeed,
      cloudCover: hour.cloudCover, precip: hour.precipitation,
      precipType: hour.snowfall > 0 ? "snow" : hour.rain > 0 ? "rain" : undefined },
    { precip24h, tempMin24h, tempMax24h },
    isEarlyMorning
  );

  // Clothing — offset by effort level and runs-hot preference
  const effortOffset = EFFORT_HEAT_OFFSET[selectedEffort];
  const hotOffset = state.runsHot ? 5 : 0;
  const feelsLike = getRunnerFeelsLike(hour.apparentTemperature) - 15 + effortOffset + hotOffset;
  const clothing = getClothingRec(feelsLike, {
    windMph: hour.windSpeed,
    precipitating: hour.precipitation > 0,
    coldAndPrecip: hour.precipitation > 0 && hour.temperature < 35,
    uvIndex: hour.uvIndex,
  });

  // Run type
  const runType = suggestRunType({
    tempF: hour.temperature, dewPointF: hour.dewPoint, windMph: hour.windSpeed,
    windGust: hour.windGusts, precipProb: hour.precipProbability,
    iceRisk: iceRisk.risk, windChillF: wc,
  }, tempDisplay, speedDisplay);

  // Daylight — simple: is the selected time before sunrise or after sunset?
  const hourTime = new Date(hour.time);
  const sunset = new Date(daily.sunset);
  const sunrise = new Date(daily.sunrise);
  const minsAfterSunset = Math.round((hourTime.getTime() - sunset.getTime()) / 60000);
  const minsBeforeSunrise = Math.round((sunrise.getTime() - hourTime.getTime()) / 60000);
  const daylightMessages: string[] = [];
  if (minsBeforeSunrise > 0) {
    daylightMessages.push(`${minsBeforeSunrise} min before sunrise`);
  }
  if (minsAfterSunset > 0) {
    daylightMessages.push(`${minsAfterSunset} min after sunset`);
  } else if (minsAfterSunset > -30) {
    // Within 30 min of sunset — heads up
    daylightMessages.push(`Sunset in ${Math.abs(minsAfterSunset)} min`);
  }
  const isDark = minsBeforeSunrise > 0 || minsAfterSunset > 0;

  // Add reflective gear to clothing when running in the dark
  if (isDark) {
    if (!clothing.accessories.includes("Reflective vest")) clothing.accessories.push("Reflective vest");
    if (!clothing.accessories.includes("Headlamp")) clothing.accessories.push("Headlamp");
  }

  // AQI
  const aqiForHour = airQuality?.hourlyAQI[hour.time];
  const aqiCat = getAQICategory(aqiForHour);

  // Safety alerts
  const recentPrecip = getRecentPrecipSum(weather.hourly, hourTime, 6);
  const safetyAlerts = getSafetyAlerts(hour, recentPrecip, aqiForHour, tempDisplay, speedDisplay);

  // Next rain / thunderstorm (scan all future hours, not just selected day)
  const nextRain = findNextPrecip(weather.hourly, hourTime);
  const nextThunderstorm = findNextThunderstorm(weather.hourly, hourTime);

  // Surface conditions → fold into safety alerts
  if (iceRisk.risk === "HIGH") {
    safetyAlerts.push({ severity: "danger", type: "surface", title: "High Ice Risk", message: iceRisk.reasons.join(". ") });
  } else if (iceRisk.risk === "MODERATE") {
    safetyAlerts.push({ severity: "warning", type: "surface", title: "Moderate Ice Risk", message: iceRisk.reasons.join(". ") });
  } else if (iceRisk.risk === "LOW") {
    safetyAlerts.push({ severity: "caution", type: "surface", title: "Low Ice Risk", message: iceRisk.reasons.join(". ") });
  } else if (recentPrecip > 0.5) {
    safetyAlerts.push({ severity: "info", type: "surface", title: "Wet Surfaces", message: "Recent rain - expect puddles and slick spots." });
  } else if (hour.precipitation > 0) {
    safetyAlerts.push({ severity: "info", type: "surface", title: "Wet Conditions", message: "Active precipitation - surfaces will be slippery." });
  }

  // Re-sort after adding surface alerts
  const SEVERITY_ORDER: SafetyAlert["severity"][] = ["danger", "warning", "caution", "info"];
  safetyAlerts.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  return {
    hour, daily, paceAdjustment: paceAdj, adjustedPaces, windChill: wc,
    iceRisk, clothing, runType,
    daylight: { sunrise: formatTime(sunrise), sunset: formatTime(sunset), message: daylightMessages.length > 0 ? daylightMessages.join(". ") : null },
    aqiForHour, aqiCategory: aqiCat.category,
    safetyAlerts, nextRain, nextThunderstorm,
  };
}

function computeBestWindow(): BestWindowResult {
  const { weather } = state;
  const daily = state.availableDays.find(d => d.date === state.selectedDayDate) || weather.daily;
  const dayHours = weather.hourly.filter(h => h.time.startsWith(state.selectedDayDate));
  const now = new Date();

  const past24h = weather.hourly.filter(h => {
    const t = new Date(h.time);
    return t < now && t > new Date(now.getTime() - 86400000);
  });
  const tempMin24h = past24h.length ? Math.min(...past24h.map(h => h.temperature)) : 50;
  const tempMax24h = past24h.length ? Math.max(...past24h.map(h => h.temperature)) : 50;
  const precip24h = past24h.reduce((s, h) => s + h.precipitation, 0);

  const conditions: HourlyConditions[] = dayHours.map(h => ({
    time: h.time, temperature: h.temperature, dewPoint: h.dewPoint,
    windSpeed: h.windSpeed, windGust: h.windGusts,
    precipProbability: h.precipProbability, cloudCover: h.cloudCover, uvIndex: h.uvIndex,
    iceRisk: getIceRisk(
      { tempF: h.temperature, dewPointF: h.dewPoint, windMph: h.windSpeed, cloudCover: h.cloudCover, precip: h.precipitation },
      { precip24h, tempMin24h, tempMax24h }, new Date(h.time).getHours() < 8
    ).risk,
  }));

  return findBestWindow(conditions, daily.sunrise, daily.sunset, 60, tempDisplay);
}

// ─── Briefing Summary Generator ──────────────────────────────────────────────
function generateBriefingSummary(b: HourBriefing): string {
  const parts: string[] = [];

  // Run type mapping
  const typeMap: Record<string, string> = {
    ANY: "Perfect conditions for any workout.",
    MODERATE_TO_HARD: "Great day to push the pace.",
    MODERATE: "Solid day for a moderate effort.",
    EASY: "Good day for easy miles.",
    TREADMILL_OR_EASY: "Keep it easy or take it inside.",
    TREADMILL: "Treadmill day — conditions are rough.",
  };
  parts.push(typeMap[b.runType.type] || "Check conditions before heading out.");

  // Weather modifier
  const feelsF = b.hour.apparentTemperature;
  if (feelsF < 25) parts.push("Layer up heavy.");
  else if (feelsF < 40) parts.push("Layer up.");
  else if (feelsF > 90) parts.push("Stay light and hydrate.");
  else if (feelsF > 80) parts.push("Stay light.");

  if (b.iceRisk.risk === "HIGH") parts.push("Watch for ice.");
  else if (b.iceRisk.risk === "MODERATE") parts.push("Possible ice patches.");

  if (b.hour.precipitation > 0 || b.hour.precipProbability > 60) parts.push("Bring rain gear.");

  // Pace context
  const pctMin = b.paceAdjustment.min;
  if (pctMin >= 2) {
    parts.push(`Expect to run ~${pctMin}% slower in the ${b.paceAdjustment.type}.`);
  }

  return parts.join(" ");
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render(): void {
  const skeleton = document.getElementById("briefing-skeleton");
  const live = document.getElementById("briefing-live");
  if (!skeleton || !live) return;

  const hour = state.displayHours[state.selectedHourIndex];
  if (!hour) return;

  const b = computeForHour(hour);
  const bw = computeBestWindow();

  const alertsHTML = renderAlerts(b.safetyAlerts);
  const feedbackHTML = renderFeedback(b, state);
  const primaryHTML = [renderDetailCard(b), renderForecast(), renderClothing(b)].join("");
  const secondaryHTML = [renderPaceEffort(b), renderDetailsRow(b, bw)].join("");

  live.innerHTML = `
    ${alertsHTML}
    ${feedbackHTML}
    <div class="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6 lg:items-start">
      <div class="flex flex-col gap-4">${primaryHTML}</div>
      <div class="flex flex-col gap-4 mt-4 lg:mt-0">${secondaryHTML}</div>
    </div>
  `;

  skeleton.classList.add("hidden");
  live.classList.remove("hidden");

  if (!eventsBound) {
    bindEvents();
    eventsBound = true;
  }
}

// ─── Render: Forecast (Day Tabs + Hourly Timeline) ──────────────────────────
function renderForecast(): string {
  // Day tabs
  const dayTabs = state.availableDays.map(d => {
    const active = d.date === state.selectedDayDate;
    const label = getDayLabel(d.date);
    return `<button data-action="select-day" data-day="${d.date}"
      class="shrink-0 rounded-[var(--radius-inner)] px-2.5 py-1 text-xs font-semibold transition-colors
        ${active ? "bg-primary/10 text-foreground card-inset" : "text-muted-foreground hover:text-foreground"}"
    >${esc(label)}</button>`;
  }).join("");

  // Timeline pills
  const hours = state.displayHours;
  const offset = state.timelineOffset;
  const visible = hours.slice(offset, offset + TIMELINE_VISIBLE);
  const canBack = offset > 0;
  const canFwd = offset + TIMELINE_VISIBLE < hours.length;

  const pills = visible.map((h, i) => {
    const idx = offset + i;
    const sel = idx === state.selectedHourIndex;
    const hr = new Date(h.time).getHours();
    const label = hr === 0 ? "12a" : hr < 12 ? `${hr}a` : hr === 12 ? "12p" : `${hr - 12}p`;
    const icon = getConditionIcon(h.weatherCode);

    return `<button data-action="select-hour" data-hour-index="${idx}"
      class="flex w-16 shrink-0 flex-col items-center gap-1 rounded-[var(--radius-inner)] p-2 transition-colors cursor-pointer
        ${sel ? "bg-primary/8 card-inset" : "hover:bg-muted"}"
      aria-label="${formatTime(new Date(h.time))}" aria-pressed="${sel}">
      <span class="text-xs font-medium ${sel ? "text-primary font-bold" : "text-muted-foreground"}">${label}</span>
      ${icon}
      <span class="text-sm font-bold text-foreground">${tempDisplay(h.temperature)}</span>
    </button>`;
  }).join("");

  const navCls = "flex h-8 w-8 items-center justify-center rounded-[var(--radius-inner)] text-muted-foreground transition-colors";

  return `
    <div class="rounded-[var(--radius-container)] card-surface-raised p-4">
      <div class="mb-3 flex items-center gap-2">
        <p class="shrink-0 text-sm font-semibold text-foreground">Forecast</p>
        <div class="flex gap-1.5 overflow-x-auto">${dayTabs}</div>
      </div>
      <div class="flex items-center gap-2">
        <button data-action="timeline-back" class="${navCls} ${canBack ? "hover:text-foreground hover:bg-muted" : "opacity-30 cursor-not-allowed"}" ${canBack ? "" : "disabled"}>${chevronLeft}</button>
        <div class="flex flex-1 gap-2 overflow-hidden justify-center">${pills}</div>
        <button data-action="timeline-forward" class="${navCls} ${canFwd ? "hover:text-foreground hover:bg-muted" : "opacity-30 cursor-not-allowed"}" ${canFwd ? "" : "disabled"}>${chevronRight}</button>
      </div>
    </div>`;
}

// ─── Render: Safety Status Bar (fixed height — no layout shift) ─────────────
function renderAlerts(alerts: SafetyAlert[]): string {
  const checkSvg = `<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

  if (!alerts.length) {
    return `<div class="mb-3 flex items-center gap-2 rounded-[var(--radius-base)] bg-success/5 px-3 py-2">
      <span class="text-success-foreground shrink-0">${checkSvg}</span>
      <p class="text-xs font-medium text-success-foreground">No safety concerns</p>
    </div>`;
  }

  const worst = alerts[0];
  const st = ALERT_STYLES[worst.severity] || ALERT_STYLES.info;

  if (alerts.length === 1) {
    return `<div class="mb-3 rounded-[var(--radius-base)] border-l-4 ${st.border} ${st.bg} px-3 py-2">
      <div class="flex items-center gap-2">
        <span class="${st.text} shrink-0">${st.icon}</span>
        <div class="min-w-0">
          <p class="text-xs font-bold ${st.text}">${esc(worst.title)}</p>
          <p class="text-xs text-muted-foreground truncate">${esc(worst.message)}</p>
        </div>
      </div>
    </div>`;
  }

  // Multiple alerts — collapsible summary
  const expanded = state.alertsExpanded;
  const types = [...new Set(alerts.map(a => a.title.split(":")[0].trim()))].slice(0, 3).join(", ");

  let details = "";
  if (expanded) {
    details = alerts.map(a => {
      const ast = ALERT_STYLES[a.severity] || ALERT_STYLES.info;
      return `<div class="mt-2 border-t border-border/30 pt-2">
        <p class="text-xs font-bold ${ast.text}">${esc(a.title)}</p>
        <p class="text-xs text-muted-foreground">${esc(a.message)}</p>
      </div>`;
    }).join("");
  }

  return `<div class="mb-3 rounded-[var(--radius-base)] border-l-4 ${st.border} ${st.bg} px-3 py-2">
    <button data-action="toggle-alerts" class="flex w-full items-center gap-2 text-left">
      <span class="${st.text} shrink-0">${st.icon}</span>
      <p class="flex-1 text-xs font-bold ${st.text}">${alerts.length} alerts: ${types}</p>
      <span class="text-xs text-muted-foreground shrink-0">${expanded ? "▴" : "▾"}</span>
    </button>
    ${details}
  </div>`;
}

// ─── Render: Primary Detail Card ─────────────────────────────────────────────
function renderDetailCard(b: HourBriefing): string {
  const h = b.hour;
  const hourLabel = formatTime(new Date(h.time));
  const icon = getConditionIcon(h.weatherCode);
  const condLabel = getConditionLabel(h.weatherCode);

  // Run type
  const typeColors: Record<string, string> = {
    TREADMILL: "bg-error/15 text-error", TREADMILL_OR_EASY: "bg-warning/15 text-warning-foreground",
    EASY: "bg-info/15 text-info-foreground", MODERATE: "bg-warning/15 text-warning-foreground",
    MODERATE_TO_HARD: "bg-success/15 text-success-foreground", ANY: "bg-success/15 text-success-foreground",
  };
  const typeLabels: Record<string, string> = {
    TREADMILL: "Treadmill Day", TREADMILL_OR_EASY: "Treadmill / Easy", EASY: "Easy Day",
    MODERATE: "Moderate Effort", MODERATE_TO_HARD: "Moderate to Hard", ANY: "Any Workout",
  };

  // AQI
  const aqiStr = b.aqiForHour !== undefined ? `${b.aqiForHour} · ${b.aqiCategory}` : "N/A";
  const aqiColor = b.aqiForHour !== undefined && b.aqiForHour > 100 ? "text-warning-foreground" : "";

  // Next rain / thunderstorm
  let forecastNote = "";
  if (b.nextThunderstorm) {
    const ts = formatTime(new Date(b.nextThunderstorm));
    const tsDay = getDayLabel(b.nextThunderstorm.slice(0, 10));
    forecastNote = `<p class="text-xs text-error font-medium">⚡ Thunderstorms: ${tsDay} ${ts}</p>`;
  }
  if (b.nextRain) {
    const rainTime = formatTime(new Date(b.nextRain.time));
    const rainDay = getDayLabel(b.nextRain.time.slice(0, 10));
    const dayLabel = rainDay === "Today" ? "" : `${rainDay} `;
    const rainIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline h-3.5 w-3.5 text-info align-text-bottom"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`;
    forecastNote += `<p class="text-xs text-info">${rainIcon} Next rain: ${dayLabel}${rainTime} (${b.nextRain.prob}%)</p>`;
  } else if (b.hour.precipitation > 0 || b.hour.precipProbability >= 40) {
    const rainIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline h-3.5 w-3.5 text-info align-text-bottom"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`;
    forecastNote += `<p class="text-xs text-info">${rainIcon} Rain expected at ${formatTime(new Date(b.hour.time))} (${b.hour.precipProbability}%)</p>`;
  } else if (!b.nextThunderstorm) {
    forecastNote = `<p class="text-xs text-success-foreground">No rain in forecast</p>`;
  }

  // Determine accent stripe color based on worst safety alert
  const worstSeverity = b.safetyAlerts.length > 0 ? b.safetyAlerts[0].severity : null;
  const stripeColor = worstSeverity === "danger" ? "border-l-error" : worstSeverity === "warning" ? "border-l-warning" : worstSeverity === "caution" ? "border-l-warning/50" : "border-l-primary/40";

  return `
    <div class="rounded-[var(--radius-container)] card-surface-raised p-5 border-l-[3px] ${stripeColor}">
      <div class="mb-1 flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${typeColors[b.runType.type] || ""}">${typeLabels[b.runType.type] || b.runType.type}</span>
        <span class="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">${icon} ${esc(condLabel)} · ${hourLabel}</span>
      </div>
      <h2 class="font-[var(--font-display)] text-xl italic text-foreground sm:text-2xl leading-snug mt-1">${esc(generateBriefingSummary(b))}</h2>

      <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span class="font-semibold text-foreground">${tempDisplay(h.temperature)}</span>
        <span>Feels ${tempDisplay(h.apparentTemperature)}</span>
        <span>${state.useMetric ? Math.round(h.windSpeed * 1.609) : Math.round(h.windSpeed)}${state.useMetric ? "km/h" : "mph"} wind</span>
        <span>${h.precipProbability}% precip</span>
      </div>

      <div class="mt-4 grid grid-cols-4 gap-x-3 gap-y-2 sm:gap-x-6">
        <div>
          <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Humid</p>
          <p class="text-base font-bold text-foreground sm:text-lg">${Math.round(h.humidity)}%</p>
        </div>
        <div>
          <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dew Pt</p>
          <p class="text-base font-bold text-foreground sm:text-lg">${tempDisplay(h.dewPoint)}</p>
        </div>
        <div>
          <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Gusts</p>
          <p class="text-base font-bold text-foreground sm:text-lg">${state.useMetric ? Math.round(h.windGusts * 1.609) : Math.round(h.windGusts)}<span class="text-xs font-normal">${state.useMetric ? "km/h" : "mph"}</span></p>
        </div>
        <div>
          <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">UV</p>
          <p class="text-base font-bold text-foreground sm:text-lg">${h.uvIndex}</p>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3">
        <p class="text-xs text-muted-foreground">AQI: <span class="font-semibold ${aqiColor}">${aqiStr}</span></p>
        <p class="text-xs text-muted-foreground">Visibility: <span class="font-semibold">${state.useMetric ? (h.visibility / 1000).toFixed(1) + " km" : (h.visibility / 1609).toFixed(1) + " mi"}</span></p>
      </div>

      <div class="mt-2">${forecastNote}</div>
    </div>`;
}

// ─── Render: Pace & Effort (combined) ────────────────────────────────────────
function renderPaceEffort(b: HourBriefing): string {
  const h = b.hour;

  // Effort pills
  const effortPills = EFFORTS.map(e => {
    const active = e === state.selectedEffort;
    const hasPace = state.paces[e] > 0;
    return `<button data-action="select-effort" data-effort="${e}"
      class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors
        ${active ? "bg-primary/10 text-foreground card-inset" : hasPace ? "text-foreground hover:bg-muted" : "text-muted-foreground"}"
    >${EFFORT_LABELS[e]}</button>`;
  }).join("");

  // Pace adjustment info
  const pctStr = b.paceAdjustment.warning
    ? b.paceAdjustment.warning
    : b.paceAdjustment.min === 0 && b.paceAdjustment.max === 0
      ? "No adjustment"
      : `+${b.paceAdjustment.min}–${b.paceAdjustment.max}% (${b.paceAdjustment.type})`;

  // Pace table rows (if paces set)
  let paceSection = "";
  if (b.adjustedPaces.length > 0) {
    const rows = b.adjustedPaces.map(p => {
      const isActive = p.effort === state.selectedEffort;
      return `<tr class="${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}">
        <td class="py-0.5 pr-3 text-xs">${p.label}</td>
        <td class="py-0.5 pr-3 text-xs tabular-nums">${p.base}${paceUnit()}</td>
        <td class="py-0.5 text-xs tabular-nums">${p.adjusted}${paceUnit()}</td>
      </tr>`;
    }).join("");

    paceSection = `
      <div class="mt-3 border-t border-border pt-3">
        <p class="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pace · ${pctStr}</p>
        <table class="w-full"><thead>
          <tr class="text-muted-foreground"><th class="py-0.5 pr-3 text-left text-[10px] font-medium uppercase tracking-wider">Effort</th><th class="py-0.5 pr-3 text-left text-[10px] font-medium uppercase tracking-wider">Base</th><th class="py-0.5 text-left text-[10px] font-medium uppercase tracking-wider">Adjusted</th></tr>
        </thead><tbody>${rows}</tbody></table>
      </div>`;
  } else {
    paceSection = `
      <div class="mt-3 border-t border-border pt-2">
        <p class="text-xs text-muted-foreground">${pctStr}</p>
      </div>`;
  }

  // Wind impact note
  let windNote = "";
  if (h.windSpeed > 10) {
    const headwindPenaltyRaw = windImpactSeconds(h.windSpeed, true);
    const headwindPenalty = Math.round(state.useMetric ? headwindPenaltyRaw / 1.609 : headwindPenaltyRaw);
    windNote = `<p class="mt-2 text-xs text-muted-foreground">Wind impact: ~${headwindPenalty}s${paceUnit()} headwind penalty at ${speedDisplay(h.windSpeed)}</p>`;
  }

  // Settings panel
  const isOpen = state.settingsOpen;
  let settingsPanel = "";
  if (isOpen) {
    const paceInputs = EFFORTS.map(e => {
      const val = state.paces[e] > 0 ? formatPace(paceForDisplay(state.paces[e])) : "";
      return `<div>
        <label class="mb-0.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground" for="pace-${e}">${EFFORT_LABELS[e]}${e === "easy" ? " *" : ""}</label>
        <input id="pace-${e}" data-pace-effort="${e}" type="text" placeholder="m:ss${paceUnit()}"
          value="${esc(val)}"
          class="h-7 w-full rounded-[var(--radius-inner)] card-inset px-2 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
          inputmode="text" />
      </div>`;
    }).join("");

    settingsPanel = `
      <div class="mt-3 border-t border-border pt-3">
        <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">${paceInputs}</div>
        <div class="mt-3 flex items-center justify-between">
          <label class="flex items-center gap-2 cursor-pointer">
            <span class="text-xs text-muted-foreground">Runs hot</span>
            <button data-action="toggle-runs-hot" class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${state.runsHot ? "bg-primary" : "bg-muted"}" role="switch" aria-checked="${state.runsHot}">
              <span class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${state.runsHot ? "translate-x-4" : "translate-x-0.5"}"></span>
            </button>
          </label>
          <button data-action="save-paces" class="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">Save</button>
        </div>
      </div>`;
  }

  return `
    <div class="rounded-[var(--radius-container)] card-surface-raised p-4">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-foreground">Pace & Effort</p>
        <div class="flex items-center gap-2">
          ${state.runsHot ? '<span class="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">Hot</span>' : ""}
          <button data-action="toggle-settings" class="flex h-6 w-6 items-center justify-center rounded-[var(--radius-inner)] text-muted-foreground transition-colors hover:text-foreground ${isOpen ? "card-inset" : "hover:bg-muted"}" aria-label="Settings">${settingsIcon}</button>
        </div>
      </div>
      <div class="mt-2 flex gap-1.5 overflow-x-auto pb-1">${effortPills}</div>
      ${paceSection}
      ${windNote}
      ${settingsPanel}
    </div>`;
}

// renderTimeline — removed, merged into renderForecast

// ─── Render: Best Window + Daylight ──────────────────────────────────────────
function renderDetailsRow(b: HourBriefing, bw: BestWindowResult): string {
  // Daylight context for selected hour
  let daylightExtra = "";
  if (b.daylight.message) {
    daylightExtra += `<p class="mt-1 text-xs text-muted-foreground">${esc(b.daylight.message)}</p>`;
  }
  const activePace = state.paces[state.selectedEffort] || state.paces.easy;
  if (activePace > 0) {
    const hourTime = new Date(b.hour.time);
    const sunset = new Date(b.daily.sunset);
    const minsToSunset = (sunset.getTime() - hourTime.getTime()) / 60000;
    if (minsToSunset > 0 && minsToSunset < 480) {
      const miles = minsToSunset / (activePace / 60);
      daylightExtra += `<p class="mt-1 text-xs text-muted-foreground">~${distDisplay(miles)} at ${EFFORT_LABELS[state.selectedEffort].toLowerCase()} pace before sunset</p>`;
    }
  }

  // Ranked windows
  const windowColors: Record<string, string> = { Best: "text-primary", Good: "text-success-foreground", Fair: "text-muted-foreground" };
  const windowRows = bw.ranked.map(w => {
    const start = w.startHour ? formatTime(new Date(w.startHour)) : "--";
    const end = w.endHour ? formatTime(new Date(w.endHour)) : "--";
    const isPrimary = w.label === "Best";
    return `<div class="flex items-baseline gap-2 ${isPrimary ? "" : "mt-1"}">
      <span class="w-8 text-[10px] font-bold uppercase ${windowColors[w.label] || "text-muted-foreground"}">${w.label}</span>
      <span class="text-sm ${isPrimary ? "font-bold text-foreground" : "font-medium text-muted-foreground"}">${start} – ${end}</span>
      <span class="text-xs text-muted-foreground">${esc(w.summary)}</span>
    </div>`;
  }).join("");

  return `
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      <div class="rounded-[var(--radius-base)] card-surface-raised p-4">
        <p class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Run Windows</p>
        ${windowRows || '<p class="text-xs text-muted-foreground">No data available</p>'}
      </div>
      <div class="rounded-[var(--radius-base)] card-surface-raised p-4">
        <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Daylight</p>
        <p class="mt-1 text-sm font-semibold text-foreground">${b.daylight.sunrise} - ${b.daylight.sunset}</p>
        ${daylightExtra}
      </div>
    </div>`;
}

// ─── Render: Clothing ────────────────────────────────────────────────────────
function renderClothing(b: HourBriefing): string {
  const h = b.hour;

  // Compute adjusted feels-like FIRST (needed for annotations)
  const effortOffset = EFFORT_HEAT_OFFSET[state.selectedEffort];
  const hotOffset = state.runsHot ? 5 : 0;
  const adjustedFeels = getRunnerFeelsLike(h.apparentTemperature) - 15 + effortOffset + hotOffset;

  // Annotate items with WHY context based on current conditions
  function annotate(item: string, isClothing: boolean): { value: string; reason: string } {
    // Condition-driven accessories
    if (item.includes("Wind-resistant"))
      return { value: item, reason: `${speedDisplay(h.windSpeed)} winds` };
    if (item.includes("Water-resistant") || item.includes("Waterproof"))
      return { value: item, reason: `${h.precipProbability}% precip` };
    if (item === "Sunscreen")
      return { value: item, reason: `UV ${h.uvIndex}` };
    if (item.includes("Brimmed cap"))
      return { value: item, reason: "Cold rain" };
    if (item === "Reflective vest" || item === "Headlamp")
      return { value: item, reason: "After dark" };
    if (item.includes("Balaclava") || item.includes("Face coverage"))
      return { value: item, reason: `Wind chill ${tempDisplay(b.windChill)}` };
    // UV-driven when notable
    if ((item === "Lightweight cap" || item === "Sunglasses") && h.uvIndex >= 6)
      return { value: item, reason: `UV ${h.uvIndex}` };
    // Temperature-driven (bottom, top, cold-weather gear)
    if (isClothing || item.includes("loves") || item.includes("Beanie") ||
        item.includes("ear cover") || item.includes("Neck gaiter") ||
        item.includes("Arm sleeves") || item.includes("Headband"))
      return { value: item, reason: `${tempDisplay(adjustedFeels)}` };
    // No annotation
    return { value: item, reason: "" };
  }

  const items = [
    { label: "Bottom", ...annotate(b.clothing.bottom, true) },
    { label: "Top", ...annotate(b.clothing.top, true) },
    ...b.clothing.accessories.map(a => ({ label: "Gear", ...annotate(a, false) })),
  ];

  // Key factors summary
  const factors: string[] = [];
  if (h.windSpeed > 15) factors.push(`${speedDisplay(h.windSpeed)} wind`);
  if (h.precipitation > 0 || h.precipProbability > 40) factors.push(`${h.precipProbability}% rain`);
  if (h.uvIndex >= 6) factors.push(`UV ${h.uvIndex}`);
  if (b.iceRisk.risk !== "NONE") factors.push(`${b.iceRisk.risk.toLowerCase()} ice risk`);
  const factorStr = factors.length ? ` · ${factors.join(", ")}` : "";

  const effortTag = state.selectedEffort !== "easy"
    ? `<span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">${EFFORT_LABELS[state.selectedEffort]}</span>` : "";
  const hotTag = state.runsHot
    ? '<span class="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">Runs hot</span>' : "";

  // Group items by zone
  const zones: { label: string; items: typeof items }[] = [
    { label: "LEGS", items: items.filter(it => it.label === "Bottom") },
    { label: "TORSO", items: items.filter(it => it.label === "Top") },
    { label: "EXTRAS", items: items.filter(it => it.label === "Gear") },
  ].filter(z => z.items.length > 0);

  return `
    <div class="rounded-[var(--radius-container)] card-surface-raised accent-stripe p-5">
      <div class="mb-1 flex flex-wrap items-center gap-2">
        <p class="text-sm font-semibold text-foreground">What to Wear</p>
        ${effortTag}${hotTag}
      </div>
      <p class="mb-4 text-xs text-muted-foreground">${tempDisplay(h.apparentTemperature)} feels-like + ${tempDeltaDisplay(effortOffset)} effort${hotOffset > 0 ? ` + ${tempDeltaDisplay(hotOffset)} hot` : ""} = dressing for ${tempDisplay(adjustedFeels)}${factorStr}</p>
      <div class="space-y-3">
        ${zones.map(zone => {
          const isCore = zone.label === "LEGS" || zone.label === "TORSO";
          return `<div>
            <p class="mb-1.5 text-[10px] font-medium uppercase tracking-wider ${isCore ? "text-primary/70" : "text-muted-foreground"}">${zone.label}</p>
            <div class="flex flex-wrap gap-2">
              ${zone.items.map(it => `<span class="inline-flex items-center gap-1.5 rounded-full ${isCore ? "bg-background border border-primary/20" : "bg-background border border-border/60"} px-3 py-1.5 text-sm font-medium text-foreground">
                ${esc(it.value)}${it.reason ? `<span class="text-xs text-muted-foreground">${esc(it.reason)}</span>` : ""}
              </span>`).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}

// ─── Render: Error ───────────────────────────────────────────────────────────
function renderError(message: string): void {
  const skeleton = document.getElementById("briefing-skeleton");
  const live = document.getElementById("briefing-live");
  if (!skeleton || !live) return;
  live.innerHTML = `<div class="rounded-[var(--radius-container)] card-surface-raised p-6">
    <div class="flex items-center gap-3 text-error">
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      <p class="text-sm font-medium">${esc(message)}</p>
    </div>
  </div>`;
  skeleton.classList.add("hidden");
  live.classList.remove("hidden");
}

// ─── Feedback bridge helpers ─────────────────────────────────────────────────
function getBriefingForFeedback(): FeedbackBriefing | null {
  const hour = state.displayHours[state.selectedHourIndex];
  if (!hour) return null;
  const b = computeForHour(hour);
  return b;
}

function getFeedbackContext(): FeedbackContext {
  const bw = computeBestWindow();
  const daily = state.availableDays.find(d => d.date === state.selectedDayDate) || state.weather.daily;
  return {
    locationName: state.locationName,
    lat: state.lat,
    lng: state.lng,
    selectedEffort: state.selectedEffort,
    runsHot: state.runsHot,
    basePace: state.paces[state.selectedEffort] || 0,
    bestWindowStart: bw.startHour,
    bestWindowEnd: bw.endHour,
    sunrise: daily.sunrise,
    sunset: daily.sunset,
  };
}

// ─── Event Binding (ONCE) ────────────────────────────────────────────────────
function bindEvents(): void {
  const live = document.getElementById("briefing-live");
  if (!live) return;

  live.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case "select-day":
        switchDay(target.dataset.day || state.selectedDayDate);
        break;
      case "select-hour": {
        const idx = parseInt(target.dataset.hourIndex || "0", 10);
        if (idx !== state.selectedHourIndex) { state.selectedHourIndex = idx; state.alertsExpanded = false; render(); }
        break;
      }
      case "select-effort": {
        const eff = target.dataset.effort as EffortLevel;
        if (EFFORTS.includes(eff) && eff !== state.selectedEffort) {
          state.selectedEffort = eff; saveEffort(eff); render();
        }
        break;
      }
      case "timeline-back":
        if (state.timelineOffset > 0) {
          state.timelineOffset = Math.max(0, state.timelineOffset - TIMELINE_VISIBLE);
          render();
        }
        break;
      case "timeline-forward":
        if (state.timelineOffset + TIMELINE_VISIBLE < state.displayHours.length) {
          state.timelineOffset = Math.min(state.displayHours.length - TIMELINE_VISIBLE, state.timelineOffset + TIMELINE_VISIBLE);
          render();
        }
        break;
      case "toggle-alerts":
        state.alertsExpanded = !state.alertsExpanded; render();
        break;
      case "toggle-settings":
        state.settingsOpen = !state.settingsOpen; render();
        break;
      case "toggle-runs-hot":
        state.runsHot = !state.runsHot; saveRunsHot(state.runsHot); render();
        break;
      case "save-paces": {
        const newPaces = { ...EMPTY_PACES };
        for (const e of EFFORTS) {
          const input = document.getElementById(`pace-${e}`) as HTMLInputElement | null;
          if (input && input.value.trim()) {
            const parsed = parsePace(input.value);
            if (parsed > 0) newPaces[e] = state.useMetric ? Math.round(parsed * 1.609344) : parsed;
          }
        }
        if (newPaces.easy > 0 || Object.values(newPaces).some(v => v > 0)) {
          state.paces = newPaces; savePaces(newPaces);
          state.settingsOpen = false; render();
        }
        break;
      }
      case "open-feedback":
      case "dismiss-feedback":
      case "feedback-select":
      case "feedback-submit":
      case "feedback-shoe-other":
        handleFeedbackAction(action, target, state, getBriefingForFeedback, getFeedbackContext, render);
        break;
    }
  });

  // Enter key in pace inputs
  live.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement;
    if (e.key === "Enter" && target.matches("[data-pace-effort]")) {
      live.querySelector<HTMLButtonElement>("[data-action='save-paces']")?.click();
    }
    // Enter key in shoe text input
    if (e.key === "Enter" && target.matches("[data-action='feedback-shoe-text']")) {
      state.feedbackShoes = (target as HTMLInputElement).value.trim() || null;
      render();
    }
  });

  // Blur on shoe text input captures value
  live.addEventListener("blur", (e) => {
    const target = e.target as HTMLElement;
    if (target.matches("[data-action='feedback-shoe-text']")) {
      state.feedbackShoes = (target as HTMLInputElement).value.trim() || null;
    }
  }, true);
}


// ─── Location Change (triggered by Header.astro's custom event) ─────────────
async function changeLocation(loc: GeoLocation): Promise<void> {
  state.locationName = loc.name;
  state.lat = loc.latitude;
  state.lng = loc.longitude;

  try {
    const [weather, airQuality] = await Promise.all([
      fetchWeather(loc.latitude, loc.longitude),
      fetchAirQuality(loc.latitude, loc.longitude).catch(() => null),
    ]);

    state.weather = weather;
    state.airQuality = airQuality;

    const todayStr = localDateStr(new Date());
    state.availableDays = weather.dailyAll.filter(d => d.date >= todayStr);
    state.selectedDayDate = todayStr;
    state.displayHours = weather.hourly.filter(h => h.time.startsWith(todayStr));

    const nowHour = new Date().getHours();
    state.selectedHourIndex = state.displayHours.findIndex(h => new Date(h.time).getHours() === nowHour);
    if (state.selectedHourIndex === -1) state.selectedHourIndex = 0;

    state.timelineOffset = Math.max(0, Math.min(
      state.selectedHourIndex - Math.floor(TIMELINE_VISIBLE / 2),
      state.displayHours.length - TIMELINE_VISIBLE
    ));
    state.alertsExpanded = false;

    render();
  } catch (err) {
    renderError(err instanceof Error ? err.message : "Failed to fetch weather for new location");
  }
}
