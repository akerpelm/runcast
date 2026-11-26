/**
 * RunCast: stateful app orchestrator. Owns state, computes briefings, renders
 * the Today screen, and drives the sheets. Formulas and data fetching live in
 * their own modules and are only called from here.
 */
import { getUserLocation, requestPreciseLocation, saveLocation, searchLocations, DEFAULT_LOCATION, type GeoLocation, type GeoSource, type SearchResult } from "./geo";
import { fetchWeather } from "./weather";
import { fetchAirQuality } from "./air-quality";
import {
  type AppState, type EffortLevel, type HourBriefing,
  EFFORTS, EMPTY_PACES,
  buildRenderContext, parsePace,
  loadPaces, savePaces, loadRunsHot, saveRunsHot, loadEffort, saveEffort, loadUnits, loadDist, saveUnits, saveDist,
} from "./state";
import { localDateStr, getDayLabel, esc } from "./display";
import { computeForHour, computeBestWindow, computeHourScores, getBriefingForFeedback, getFeedbackContext, type ComputeForHourParams, type ComputeBestWindowParams } from "./compute";
import {
  renderVerdict, renderLanes, renderDayTabs, renderHourStrip, renderKitFull, renderDayRibbon,
  renderKitCompact, renderConditionsGrid, renderHourLegend, bandsFor,
  renderWindows, renderConditions, renderHourTable, renderDock, renderLogRow,
} from "./render/today";
import { renderPacesSheet, renderSettingsSheet, renderLocationSheet, renderLocationResults, type ThemeChoice } from "./render/sheets";
import { renderErrorHTML } from "./render/error";
import { hasFeedbackToday, isFeedbackDismissedToday, renderFeedback, handleFeedbackAction } from "./feedback";
import { syncFeedback } from "./sync";
import { openSheet, updateSheet, closeSheet, openSheetId, onSheetClose, notify, preloadSheets, type SheetId, type SheetView } from "./sheets/controller";

type InitOptions = { embed?: boolean };

// ─── State ───────────────────────────────────────────────────────────────────
let state: AppState;
let locationSource: GeoSource = "default";
let eventsBound = false;
let shouldScrollTimeline = true;
let animateVerdict = true;
let animateLane = false;
let embedMode = false;
let lastSearch: SearchResult[] = [];
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const THEME_KEY = "runcast-theme";
/** Illustrative paces for the hub preview, so lanes show adjusted times; labelled as samples. */
const EMBED_PACES = { easy: 510, endurance: 480, tempo: 435, threshold: 415, interval: 385 };

// ─── Entry Point ─────────────────────────────────────────────────────────────
export async function initApp(opts: InitOptions = {}): Promise<void> {
  embedMode = Boolean(opts.embed);
  try {
    const location = embedMode ? DEFAULT_LOCATION : await getUserLocation();
    locationSource = location.source;
    setLocationChip(location.name, location.source);

    const [weather, airQuality] = await Promise.all([
      fetchWeather(location.latitude, location.longitude),
      fetchAirQuality(location.latitude, location.longitude).catch(() => null),
    ]);

    const todayStr = localDateStr(new Date());
    const availableDays = weather.dailyAll.filter(d => d.date >= todayStr);
    const displayHours = weather.hourly.filter(h => h.time.startsWith(todayStr));

    state = {
      weather, airQuality, locationName: location.name,
      lat: location.latitude, lng: location.longitude,
      selectedDayDate: todayStr,
      availableDays,
      displayHours,
      selectedHourIndex: 0,
      timelineOffset: 0,
      paces: embedMode ? { ...EMBED_PACES } : loadPaces(),
      selectedEffort: embedMode ? "easy" : loadEffort(),
      runsHot: embedMode ? false : loadRunsHot(),
      useCelsius: embedMode ? false : loadUnits(),
      useMetric: embedMode ? false : loadDist(),
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
    state.selectedHourIndex = defaultHourIndex();

    render();
    if (embedMode) return;

    syncFeedback();
    window.addEventListener("runcast:open-feedback", () => openSheetById("log"));
    if (window.location.hash === "#log") openSheetById("log");
    window.addEventListener("runcast:feedback-submitted", () => syncFeedback());
    if ("requestIdleCallback" in window) requestIdleCallback(() => preloadSheets(), { timeout: 4000 });
    else setTimeout(preloadSheets, 2500);
  } catch (err) {
    renderError(err instanceof Error ? err.message : "Something went wrong");
  }
}

// ─── Derived helpers ─────────────────────────────────────────────────────────
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

/** Shade only hours still ahead; past hours today are shown as passed, not compared. */
function currentBands(): Map<string, number> {
  const startOfHour = new Date();
  startOfHour.setMinutes(0, 0, 0);
  const ahead = [...computeHourScores(makeBestWindowParams())].filter(([t]) => new Date(t) >= startOfHour);
  return ahead.length ? bandsFor(new Map(ahead)) : new Map();
}

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  return `${h} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

/** The verdict defaults to the day's best window; otherwise now (today) or 8 AM. */
function defaultHourIndex(): number {
  const bw = computeBestWindow(makeBestWindowParams());
  const bestIdx = state.displayHours.findIndex(h => h.time === bw.startHour);
  if (bestIdx !== -1) return bestIdx;
  const isToday = state.selectedDayDate === localDateStr(new Date());
  const target = isToday ? new Date().getHours() : 8;
  const idx = state.displayHours.findIndex(h => new Date(h.time).getHours() >= target);
  return idx === -1 ? Math.max(0, state.displayHours.length - 1) : idx;
}

function currentBriefing(): HourBriefing | null {
  const hour = state.displayHours[state.selectedHourIndex];
  return hour ? computeForHour({ ...makeComputeParams(), hour }) : null;
}

function readTheme(): ThemeChoice {
  const v = localStorage.getItem(THEME_KEY);
  return v === "dark" || v === "light" ? v : "system";
}

function applyTheme(choice: ThemeChoice): void {
  if (choice === "system") localStorage.removeItem(THEME_KEY);
  else localStorage.setItem(THEME_KEY, choice);
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function isLogged(): boolean {
  return state.feedbackSubmitted && hasFeedbackToday();
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render(): void {
  const skeleton = document.getElementById("briefing-skeleton");
  const live = document.getElementById("briefing-live");
  if (!skeleton || !live) return;

  const b = currentBriefing();
  if (!b) return;
  const bw = computeBestWindow(makeBestWindowParams());
  const ctx = buildRenderContext(state);
  const isBestHour = state.displayHours[state.selectedHourIndex]?.time === bw.startHour;

  const bands = currentBands();
  const hourLabel = formatHourLabel(b.hour.time);
  const sectionTitle = "font-(family-name:--font-display) text-lg font-bold uppercase tracking-[0.04em]";

  live.innerHTML = `
    ${renderDayTabs(ctx)}
    ${renderDayRibbon(b, bw, ctx, bands)}
    <div class="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-10">
      <div class="min-w-0">
        ${renderVerdict({ b, bw, ctx, isBestHour, animate: animateVerdict })}
        ${renderLanes(b, ctx, { animate: animateLane, sample: embedMode })}
        <div class="lg:hidden">${renderHourStrip(b, bw, ctx, bands)}</div>
        ${embedMode ? "" : renderLogRow(isLogged())}
      </div>
      <aside aria-label="Hour detail" class="hidden min-w-0 space-y-5 lg:block">
        <section aria-labelledby="aside-kit">
          <h2 id="aside-kit" class="${sectionTitle}">What to wear</h2>
          <div class="mt-1">${renderKitCompact(b, ctx)}</div>
        </section>
        <section aria-labelledby="aside-cond">
          <h2 id="aside-cond" class="${sectionTitle}">Conditions at ${esc(hourLabel)}</h2>
          <div class="mt-2">${renderConditionsGrid(b, ctx)}</div>
        </section>
        <section aria-labelledby="aside-windows">
          <h2 id="aside-windows" class="${sectionTitle}">Run windows</h2>
          <div class="mt-1">${renderWindows(bw, b, ctx)}</div>
        </section>
      </aside>
    </div>`;

  const dock = document.getElementById("dock");
  if (dock && !embedMode) dock.innerHTML = renderDock(isLogged());

  skeleton.classList.add("hidden");
  live.classList.remove("hidden");
  animateVerdict = false;
  animateLane = false;

  if (shouldScrollTimeline) {
    requestAnimationFrame(() => {
      centerInScroller(live.querySelector<HTMLElement>("[data-selected-pill]"), document.getElementById("timeline-scroll"));
      centerInScroller(live.querySelector<HTMLElement>("[data-action='select-day'][aria-pressed='true']"), document.getElementById("day-tabs-scroll"));
    });
    shouldScrollTimeline = false;
  }

  refreshOpenSheet(b);

  if (!eventsBound) {
    bindEvents();
    eventsBound = true;
  }
}

function centerInScroller(el: HTMLElement | null, scroller: HTMLElement | null): void {
  if (!el || !scroller) return;
  const left = el.offsetLeft - scroller.offsetLeft;
  scroller.scrollLeft = left - scroller.clientWidth / 2 + el.offsetWidth / 2;
}

function renderError(message: string): void {
  const skeleton = document.getElementById("briefing-skeleton");
  const live = document.getElementById("briefing-live");
  if (!skeleton || !live) return;
  live.innerHTML = renderErrorHTML(message);
  skeleton.classList.add("hidden");
  live.classList.remove("hidden");
  live.querySelector("[data-action='retry']")?.addEventListener("click", () => window.location.reload());
}

// ─── Sheets ──────────────────────────────────────────────────────────────────
function sheetView(id: SheetId, b: HourBriefing): SheetView {
  const ctx = buildRenderContext(state);
  const bw = computeBestWindow(makeBestWindowParams());
  const hourLabel = getDayLabel(state.selectedDayDate);
  switch (id) {
    case "hours":
      return {
        id, title: "Hour by hour", description: `${hourLabel} in ${state.locationName}. Pick an hour to see its call.`,
        snapPoints: [0.6, 0.94],
        html: `${renderHourLegend(bw)}${renderHourTable(b, bw, ctx, currentBands())}
          <h3 class="mt-6 font-(family-name:--font-display) text-lg font-bold uppercase tracking-[0.04em]">Run windows</h3>${renderWindows(bw, b, ctx)}
          <h3 class="mt-6 mb-3 font-(family-name:--font-display) text-lg font-bold uppercase tracking-[0.04em]">Conditions</h3>${renderConditions(b, ctx, { hazards: true })}`,
      };
    case "kit":
      return { id, title: "What to wear", snapPoints: [0.6, 0.94], html: renderKitFull(b, ctx) };
    case "paces":
      return { id, title: "Your paces", snapPoints: [0.94], html: renderPacesSheet(ctx) };
    case "settings":
      return { id, title: "Settings", html: renderSettingsSheet(ctx, readTheme()) };
    case "location":
      return { id, title: "Location", snapPoints: [0.94], html: renderLocationSheet(state.locationName, locationSource === "ip" || locationSource === "default") };
    case "log":
      return { id, title: "Log today's run", description: "About ten seconds. It tunes your kit picks over time.", snapPoints: [0.7, 0.94], html: renderFeedback(b, state) };
  }
}

function openSheetById(id: SheetId): void {
  const b = currentBriefing();
  if (!b) return;
  if (id === "log") {
    state.feedbackOpen = true;
    if (!hasFeedbackToday()) state.feedbackSubmitted = false;
  }
  openSheet(sheetView(id, b));
}

/** Sheets that mirror live data re-render with the page; form sheets keep their inputs. */
function refreshOpenSheet(b: HourBriefing): void {
  const id = openSheetId();
  if (id === "hours" || id === "kit" || id === "log" || id === "settings") {
    updateSheet(id, { html: sheetView(id, b).html });
  }
}

onSheetClose((id) => {
  if (id === "log") state.feedbackOpen = false;
});

// ─── Events ──────────────────────────────────────────────────────────────────
function bindEvents(): void {
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("input", onInput);
  document.addEventListener("blur", onBlur, true);
}

function onClick(e: MouseEvent): void {
  if (embedMode) return;
  const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!target) return;
  const action = target.dataset.action ?? "";

  switch (action) {
    case "open-sheet":
      openSheetById((target.dataset.sheet ?? "hours") as SheetId);
      return;
    case "select-day":
      switchDay(target.dataset.day || state.selectedDayDate);
      return;
    case "select-hour": {
      const idx = parseInt(target.dataset.hourIndex || "0", 10);
      if (idx !== state.selectedHourIndex) {
        state.selectedHourIndex = idx;
        shouldScrollTimeline = true;
        render();
      }
      return;
    }
    case "select-effort": {
      const eff = target.dataset.effort as EffortLevel;
      if (EFFORTS.includes(eff) && eff !== state.selectedEffort) {
        state.selectedEffort = eff;
        saveEffort(eff);
        animateLane = true;
        render();
      }
      return;
    }
    case "toggle-runs-hot":
      state.runsHot = !state.runsHot;
      saveRunsHot(state.runsHot);
      target.setAttribute("aria-checked", String(state.runsHot));
      target.classList.toggle("bg-infield", state.runsHot);
      target.classList.toggle("bg-input", !state.runsHot);
      target.firstElementChild?.classList.toggle("translate-x-7", state.runsHot);
      target.firstElementChild?.classList.toggle("translate-x-1", !state.runsHot);
      render();
      return;
    case "save-paces":
      savePacesFromSheet();
      return;
    case "set-temp-unit":
      state.useCelsius = target.dataset.value === "C";
      saveUnits(state.useCelsius);
      render();
      return;
    case "set-dist-unit":
      state.useMetric = target.dataset.value === "metric";
      saveDist(state.useMetric);
      render();
      return;
    case "set-theme":
      applyTheme((target.dataset.value ?? "system") as ThemeChoice);
      render();
      return;
    case "use-precise-location":
      void usePreciseLocation(target);
      return;
    case "select-location":
      selectSearchResult(parseInt(target.dataset.locIndex || "0", 10));
      return;
    case "dismiss-feedback":
    case "feedback-submit": {
      const wasSubmit = action === "feedback-submit";
      runFeedbackAction(action, target);
      closeSheet();
      if (wasSubmit && hasFeedbackToday()) notify("success", "Run logged", "Thanks. Your kit picks get sharper with every log.");
      return;
    }
    case "open-feedback":
    case "feedback-worn-confirm":
    case "feedback-worn-edit":
    case "feedback-select":
    case "feedback-shoe-other":
      runFeedbackAction(action, target);
      return;
  }
}

function runFeedbackAction(action: string, target: HTMLElement): void {
  handleFeedbackAction(
    action, target, state,
    () => getBriefingForFeedback(state.displayHours, state.selectedHourIndex, makeComputeParams()),
    () => getFeedbackContext(makeBestWindowParams(), state.locationName, state.lat, state.lng, state.selectedEffort, state.runsHot, state.paces[state.selectedEffort] || 0),
    render,
  );
}

function onKeydown(e: KeyboardEvent): void {
  const target = e.target as HTMLElement;
  if (e.key !== "Enter") return;
  if (target.matches("[data-pace-effort]")) {
    e.preventDefault();
    savePacesFromSheet();
  } else if (target.matches("[data-action='feedback-shoe-text']")) {
    state.feedbackShoes = (target as HTMLInputElement).value.trim() || null;
    render();
  } else if (target.id === "loc-search") {
    e.preventDefault();
    if (lastSearch.length) selectSearchResult(0);
  }
}

function onBlur(e: FocusEvent): void {
  const target = e.target as HTMLElement;
  if (target instanceof HTMLInputElement && target.matches("[data-action='feedback-shoe-text']")) {
    state.feedbackShoes = target.value.trim() || null;
  }
}

function onInput(e: Event): void {
  const target = e.target as HTMLElement;
  if (!(target instanceof HTMLInputElement) || target.id !== "loc-search") return;
  const query = target.value.trim();
  if (searchTimer) clearTimeout(searchTimer);
  const results = document.getElementById("loc-results");
  const status = document.getElementById("loc-status");
  if (query.length < 2) {
    if (results) results.innerHTML = "";
    return;
  }
  searchTimer = setTimeout(async () => {
    lastSearch = await searchLocations(query).catch(() => []);
    const labels = lastSearch.map(r => r.admin1 ? `${r.name}, ${r.admin1}, ${r.country}` : `${r.name}, ${r.country}`);
    if (results) results.innerHTML = renderLocationResults(labels, query);
    if (status) status.textContent = lastSearch.length ? `${lastSearch.length} places found` : "No places found";
  }, 250);
}

// ─── Actions ─────────────────────────────────────────────────────────────────
function savePacesFromSheet(): void {
  const next = { ...EMPTY_PACES };
  let invalid: string | null = null;
  for (const e of EFFORTS) {
    const input = document.getElementById(`pace-${e}`) as HTMLInputElement | null;
    const raw = input?.value.trim() ?? "";
    if (!raw) continue;
    const parsed = parsePace(raw);
    if (parsed > 0) next[e] = state.useMetric ? Math.round(parsed * 1.609344) : parsed;
    else invalid ??= e;
  }
  const errorEl = document.getElementById("pace-error");
  if (invalid) {
    if (errorEl) errorEl.textContent = `Check the ${invalid} pace. Use minutes:seconds, like 8:30.`;
    document.getElementById(`pace-${invalid}`)?.focus();
    return;
  }
  state.paces = next;
  savePaces(next);
  closeSheet();
  render();
  notify("success", Object.values(next).some(v => v > 0) ? "Paces saved" : "Paces cleared");
}

async function usePreciseLocation(button: HTMLElement): Promise<void> {
  button.setAttribute("aria-busy", "true");
  try {
    const loc = await requestPreciseLocation();
    saveLocation(loc);
    closeSheet();
    await changeLocation(loc);
  } catch {
    notify("error", "Couldn't get your location", "Location access is off for this site. Search for your city instead.");
    document.getElementById("loc-search")?.focus();
  } finally {
    button.removeAttribute("aria-busy");
  }
}

function selectSearchResult(idx: number): void {
  const r = lastSearch[idx];
  if (!r) return;
  const name = r.admin1 ? `${r.name}, ${r.admin1}` : `${r.name}, ${r.country}`;
  const loc: GeoLocation = { latitude: r.latitude, longitude: r.longitude, name, source: "saved" };
  saveLocation(loc);
  closeSheet();
  void changeLocation(loc);
}

function switchDay(dateStr: string): void {
  state.selectedDayDate = dateStr;
  state.displayHours = state.weather.hourly.filter(h => h.time.startsWith(dateStr));
  state.selectedHourIndex = defaultHourIndex();
  state.timelineOffset = 0;
  shouldScrollTimeline = true;
  animateVerdict = true;
  render();
}

function setLocationChip(name: string, source: GeoSource): void {
  const text = document.getElementById("location-text");
  const approx = document.getElementById("location-approx");
  if (text) text.textContent = name;
  const isApprox = source === "ip" || source === "default";
  approx?.classList.toggle("hidden", !isApprox);
  approx?.classList.toggle("inline-flex", isApprox);
}

async function changeLocation(loc: GeoLocation): Promise<void> {
  locationSource = loc.source;
  setLocationChip(loc.name, loc.source);
  try {
    const [weather, airQuality] = await Promise.all([
      fetchWeather(loc.latitude, loc.longitude),
      fetchAirQuality(loc.latitude, loc.longitude).catch(() => null),
    ]);
    state.locationName = loc.name;
    state.lat = loc.latitude;
    state.lng = loc.longitude;
    state.weather = weather;
    state.airQuality = airQuality;

    const todayStr = localDateStr(new Date());
    state.availableDays = weather.dailyAll.filter(d => d.date >= todayStr);
    state.selectedDayDate = todayStr;
    state.displayHours = weather.hourly.filter(h => h.time.startsWith(todayStr));
    state.selectedHourIndex = defaultHourIndex();
    state.timelineOffset = 0;
    shouldScrollTimeline = true;
    animateVerdict = true;
    render();
    notify("success", `Showing ${loc.name}`);
  } catch {
    notify("error", "Couldn't load weather", `We couldn't reach the forecast for ${loc.name}. Try again in a moment.`);
  }
}
