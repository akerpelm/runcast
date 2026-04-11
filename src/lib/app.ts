/**
 * RunCast — Stateful interactive app (slim orchestrator).
 * Multi-day, multi-pace, safety alerts, detail card, interactive timeline.
 */
import { getUserLocation, type GeoLocation } from "./geo";
import { fetchWeather } from "./weather";
import { fetchAirQuality } from "./air-quality";
import {
  type AppState, type EffortLevel,
  EFFORTS, EMPTY_PACES, TIMELINE_VISIBLE, setTimelineVisible, getTimelineVisible,
  buildRenderContext, parsePace,
  loadPaces, savePaces, loadRunsHot, saveRunsHot, loadEffort, saveEffort, loadUnits, loadDist,
} from "./state";
import { localDateStr } from "./display";
import { computeForHour, computeBestWindow, getBriefingForFeedback, getFeedbackContext, type ComputeForHourParams, type ComputeBestWindowParams } from "./compute";
import { renderHeroForecast, renderAlerts, renderPaceEffort, renderDetailsRow, renderClothing, renderErrorHTML } from "./render";
import {
  hasFeedbackToday, isFeedbackDismissedToday,
  renderFeedback, handleFeedbackAction,
} from "./feedback";
import { syncFeedback } from "./sync";

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

    // Calculate visible count before first offset to handle mobile correctly
    setTimelineVisible(getTimelineVisible());

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
      feedbackWornTop: null,
      feedbackWornBottom: null,
      feedbackWornConfirmed: false,
      feedbackWornEditing: false,
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

    // Re-render on resize to adjust timeline visible count
    let resizeTimer: ReturnType<typeof setTimeout>;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newVisible = getTimelineVisible();
        if (newVisible !== TIMELINE_VISIBLE) render();
      }, 150);
    });
  } catch (err) {
    renderError(err instanceof Error ? err.message : "Something went wrong");
  }
}

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

// ─── Helpers ────────────────────────────────────────────────────────────────
function makeComputeParams(): Omit<ComputeForHourParams, "hour"> {
  return {
    weather: state.weather,
    airQuality: state.airQuality,
    paces: state.paces,
    selectedEffort: state.selectedEffort,
    runsHot: state.runsHot,
    selectedDayDate: state.selectedDayDate,
    availableDays: state.availableDays,
    useCelsius: state.useCelsius,
    useMetric: state.useMetric,
  };
}

function makeBestWindowParams(): ComputeBestWindowParams {
  return {
    weather: state.weather,
    selectedDayDate: state.selectedDayDate,
    availableDays: state.availableDays,
    useCelsius: state.useCelsius,
  };
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render(): void {
  const skeleton = document.getElementById("briefing-skeleton");
  const live = document.getElementById("briefing-live");
  if (!skeleton || !live) return;

  setTimelineVisible(getTimelineVisible());

  // Clamp offset to new visible count
  const maxOffset = Math.max(0, state.displayHours.length - TIMELINE_VISIBLE);
  if (state.timelineOffset > maxOffset) state.timelineOffset = maxOffset;

  const hour = state.displayHours[state.selectedHourIndex];
  if (!hour) return;

  const b = computeForHour({ ...makeComputeParams(), hour });
  const bw = computeBestWindow(makeBestWindowParams());
  const ctx = buildRenderContext(state);

  const alertsHTML = renderAlerts(b.safetyAlerts, ctx.alertsExpanded);
  const feedbackHTML = renderFeedback(b, state);

  live.innerHTML = `
    ${alertsHTML}
    ${feedbackHTML}
    ${renderHeroForecast(b, ctx)}
    <div class="mt-4 lg:grid lg:grid-cols-3 lg:gap-4 lg:items-start">
      <div>${renderClothing(b, ctx)}</div>
      <div class="mt-4 lg:mt-0">${renderDetailsRow(b, bw, ctx)}</div>
      <div class="mt-4 lg:mt-0">${renderPaceEffort(b, ctx)}</div>
    </div>
  `;

  skeleton.classList.add("hidden");
  live.classList.remove("hidden");

  if (!eventsBound) {
    bindEvents();
    eventsBound = true;
  }
}

// ─── Render: Error ───────────────────────────────────────────────────────────
function renderError(message: string): void {
  const skeleton = document.getElementById("briefing-skeleton");
  const live = document.getElementById("briefing-live");
  if (!skeleton || !live) return;
  live.innerHTML = renderErrorHTML(message);
  skeleton.classList.add("hidden");
  live.classList.remove("hidden");
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
        } else {
          // At the start of this day — try previous day
          const prevDayIdx = state.availableDays.findIndex(d => d.date === state.selectedDayDate) - 1;
          if (prevDayIdx >= 0) {
            const prevDate = state.availableDays[prevDayIdx].date;
            state.selectedDayDate = prevDate;
            state.displayHours = state.weather.hourly.filter(h => h.time.startsWith(prevDate));
            // Jump to the end of the previous day
            state.selectedHourIndex = Math.max(0, state.displayHours.length - 1);
            state.timelineOffset = Math.max(0, state.displayHours.length - TIMELINE_VISIBLE);
            state.alertsExpanded = false;
            render();
          }
        }
        break;
      case "timeline-forward":
        if (state.timelineOffset + TIMELINE_VISIBLE < state.displayHours.length) {
          state.timelineOffset = Math.min(state.displayHours.length - TIMELINE_VISIBLE, state.timelineOffset + TIMELINE_VISIBLE);
          render();
        } else {
          // At the end of this day — try next day
          const nextDayIdx = state.availableDays.findIndex(d => d.date === state.selectedDayDate) + 1;
          if (nextDayIdx < state.availableDays.length) {
            const nextDate = state.availableDays[nextDayIdx].date;
            state.selectedDayDate = nextDate;
            state.displayHours = state.weather.hourly.filter(h => h.time.startsWith(nextDate));
            // Jump to the start of the next day
            state.selectedHourIndex = 0;
            state.timelineOffset = 0;
            state.alertsExpanded = false;
            render();
          }
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
      case "feedback-worn-confirm":
      case "feedback-worn-edit":
      case "feedback-select":
      case "feedback-submit":
      case "feedback-shoe-other":
        handleFeedbackAction(
          action, target, state,
          () => getBriefingForFeedback(state.displayHours, state.selectedHourIndex, makeComputeParams()),
          () => getFeedbackContext(makeBestWindowParams(), state.locationName, state.lat, state.lng, state.selectedEffort, state.runsHot, state.paces[state.selectedEffort] || 0),
          render,
        );
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
