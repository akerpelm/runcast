/**
 * State types, constants, localStorage persistence, and RenderContext.
 */
import type { WeatherData, HourlyWeather, DailyWeather } from "./weather";
import type { AirQualityData } from "./air-quality";
import type { IceRiskResult } from "./formulas/ice-risk";
import type { ClothingRec } from "./formulas/clothing";
import type { RunTypeResult } from "./formulas/run-type";
import type { SafetyAlert } from "./formulas/safety";

// ─── Types ───────────────────────────────────────────────────────────────────
export type EffortLevel = "easy" | "endurance" | "tempo" | "threshold" | "interval";

export interface UserPaces {
  easy: number;
  endurance: number;
  tempo: number;
  threshold: number;
  interval: number;
}

export interface AppState {
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
  // Feedback (4-step flow: worn clothing + clothing feel + effort + shoes)
  feedbackWornTop: string | null;
  feedbackWornBottom: string | null;
  feedbackWornConfirmed: boolean;
  feedbackWornEditing: boolean;
  feedbackClothing: string | null;
  feedbackEffortLevel: string | null;
  feedbackShoes: string | null;
  feedbackShoesOther: boolean;
  feedbackOpen: boolean;
  feedbackSubmitted: boolean;
}

export interface HourBriefing {
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
export const LS_PACES = "runcast-paces";
export const LS_RUNS_HOT = "runcast-runs-hot";
export const LS_EFFORT = "runcast-effort";
export const LS_UNITS = "runcast-units";
export const LS_DIST = "runcast-dist";
export const TIMELINE_PILL_W = 70; // ~w-16 (64px) + gap (6px)
export const TIMELINE_NAV_W = 40;  // each arrow button ~w-8 + gap
export const TIMELINE_CARD_PAD = 72; // card px-4 (16*2) + container px-4 (16*2) + buffer

export function getTimelineVisible(): number {
  // Use the main element which is always visible, not briefing-live which may be hidden
  const main = document.querySelector("main");
  if (!main) return 8;
  const available = main.offsetWidth - TIMELINE_NAV_W * 2 - TIMELINE_CARD_PAD;
  return Math.max(4, Math.min(24, Math.floor(available / TIMELINE_PILL_W)));
}
export let TIMELINE_VISIBLE = 8;
export function setTimelineVisible(v: number): void { TIMELINE_VISIBLE = v; }

export const EFFORT_LABELS: Record<EffortLevel, string> = {
  easy: "Easy", endurance: "Endurance", tempo: "Tempo",
  threshold: "Threshold", interval: "Interval",
};
export const EFFORT_HEAT_OFFSET: Record<EffortLevel, number> = {
  easy: 15, endurance: 17, tempo: 20, threshold: 22, interval: 25,
};
export const EFFORTS: EffortLevel[] = ["easy", "endurance", "tempo", "threshold", "interval"];
export const EMPTY_PACES: UserPaces = { easy: 0, endurance: 0, tempo: 0, threshold: 0, interval: 0 };

// ─── RenderContext ──────────────────────────────────────────────────────────
export interface RenderContext {
  useCelsius: boolean;
  useMetric: boolean;
  selectedEffort: EffortLevel;
  selectedDayDate: string;
  selectedHourIndex: number;
  paces: UserPaces;
  runsHot: boolean;
  settingsOpen: boolean;
  alertsExpanded: boolean;
  availableDays: DailyWeather[];
  displayHours: HourlyWeather[];
  timelineOffset: number;
  timelineVisible: number;
}

export function buildRenderContext(state: AppState): RenderContext {
  return {
    useCelsius: state.useCelsius,
    useMetric: state.useMetric,
    selectedEffort: state.selectedEffort,
    selectedDayDate: state.selectedDayDate,
    selectedHourIndex: state.selectedHourIndex,
    paces: state.paces,
    runsHot: state.runsHot,
    settingsOpen: state.settingsOpen,
    alertsExpanded: state.alertsExpanded,
    availableDays: state.availableDays,
    displayHours: state.displayHours,
    timelineOffset: state.timelineOffset,
    timelineVisible: TIMELINE_VISIBLE,
  };
}

// ─── parsePace ──────────────────────────────────────────────────────────────
export function parsePace(val: string): number {
  const v = val.trim();
  // Accept "7:00" or "700" or "1700" — insert colon if missing
  const m = v.match(/^(\d{1,2}):(\d{2})$/) || v.match(/^(\d{1,2})(\d{2})$/);
  if (!m) return 0;
  const min = parseInt(m[1], 10), sec = parseInt(m[2], 10);
  if (sec >= 60 || min < 4 || min > 20) return 0;
  return min * 60 + sec;
}

// ─── localStorage ────────────────────────────────────────────────────────────
export function loadPaces(): UserPaces {
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
export function savePaces(p: UserPaces): void { localStorage.setItem(LS_PACES, JSON.stringify(p)); }
export function loadRunsHot(): boolean { return localStorage.getItem(LS_RUNS_HOT) === "true"; }
export function saveRunsHot(v: boolean): void { localStorage.setItem(LS_RUNS_HOT, v ? "true" : "false"); }
export function loadEffort(): EffortLevel {
  const v = localStorage.getItem(LS_EFFORT);
  return EFFORTS.includes(v as EffortLevel) ? v as EffortLevel : "easy";
}
export function saveEffort(e: EffortLevel): void { localStorage.setItem(LS_EFFORT, e); }
export function loadUnits(): boolean { return localStorage.getItem(LS_UNITS) === "C"; }
export function saveUnits(celsius: boolean): void { localStorage.setItem(LS_UNITS, celsius ? "C" : "F"); }
export function loadDist(): boolean { return localStorage.getItem(LS_DIST) === "metric"; }
export function saveDist(v: boolean): void { localStorage.setItem(LS_DIST, v ? "metric" : "imperial"); }
