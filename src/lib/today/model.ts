/**
 * Today model: pure functions that decide what the Today screen shows.
 * No DOM, no React, no fetching — everything here is unit-tested.
 */
import type { HourBriefing, EffortLevel } from "../state";
import { EFFORT_HEAT_OFFSET } from "../state";
import type { BestWindowResult } from "../formulas/best-window";
import type { HourlyWeather } from "../weather";
import { getRunnerFeelsLike } from "../formulas/clothing";

// ─── Time formatting ─────────────────────────────────────────────────────────
function hourParts(d: Date): { h: string; ap: string } {
  const hr = d.getHours();
  const m = d.getMinutes();
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return { h: m ? `${h12}:${String(m).padStart(2, "0")}` : `${h12}`, ap: hr < 12 ? "AM" : "PM" };
}

/** "6–7 AM", "11 AM–12 PM". Non-breaking spaces keep a time and its meridiem together. */
export function timeRange(startISO: string, endISO: string): string {
  const a = hourParts(new Date(startISO));
  const b = hourParts(new Date(endISO));
  return a.ap === b.ap ? `${a.h}–${b.h} ${b.ap}` : `${a.h} ${a.ap}–${b.h} ${b.ap}`;
}

/** "9 AM" */
export function hourLabel(iso: string): string {
  const p = hourParts(new Date(iso));
  return `${p.h} ${p.ap}`;
}

/** "12a", "9a", "12p", "3p" */
export function shortHour(iso: string): string {
  const hr = new Date(iso).getHours();
  if (hr === 0) return "12a";
  if (hr === 12) return "12p";
  return hr < 12 ? `${hr}a` : `${hr - 12}p`;
}

export function isNightHour(time: string, sunrise: string, sunset: string): boolean {
  return time < sunrise || time >= sunset;
}

export function isCurrentHour(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getHours() === now.getHours() && d.toDateString() === now.toDateString();
}

// ─── Verdict ─────────────────────────────────────────────────────────────────
const RUN_TYPE_COPY: Record<string, string> = {
  ANY: "Any workout goes",
  MODERATE_TO_HARD: "Good day to push the pace",
  MODERATE: "Moderate effort",
  EASY: "Keep it easy",
  TREADMILL_OR_EASY: "Easy outside, or take it inside",
  TREADMILL: "Rough out there. Take it inside",
};

export function runTypeCopy(type: string, fallback: string): string {
  return RUN_TYPE_COPY[type] ?? fallback;
}

export function verdictHeadline(runType: string, hourTime: string, bw: BestWindowResult, isBestHour: boolean): string {
  if (runType === "TREADMILL") return "Treadmill day";
  const best = bw.ranked[0];
  if (isBestHour && best) return `Run ${timeRange(best.startHour, best.endHour)}`;
  return `Run at ${hourLabel(hourTime)}`;
}

/** Shown when the selected hour isn't the best window, so the better option stays visible. */
export function verdictContext(bw: BestWindowResult, isBestHour: boolean): string | null {
  const best = bw.ranked[0];
  return !isBestHour && best ? `Your pick. The best window is ${timeRange(best.startHour, best.endHour)}.` : null;
}

export function daylightNote(hourTime: string, sunrise: string, sunset: string, sunsetLabel: string): string | null {
  if (isNightHour(hourTime, sunrise, sunset)) return "Dark. Wear lights";
  const toSunset = (new Date(sunset).getTime() - new Date(hourTime).getTime()) / 60000;
  if (toSunset > 0 && toSunset <= 60) return `Sunset ${sunsetLabel}`;
  return null;
}

// ─── Pace ────────────────────────────────────────────────────────────────────
export function paceAdjLabel(adj: HourBriefing["paceAdjustment"], windMph: number): string {
  if (adj.warning) return adj.warning;
  const wind = windMph > 10;
  if (adj.min === 0 && adj.max === 0) return wind ? "Wind adjusted" : "No adjustment today";
  const range = adj.max === Infinity || adj.max === adj.min ? `+${adj.min}%` : `+${adj.min}–${adj.max}%`;
  return `${range} for ${adj.type}${wind ? " and wind" : ""}`;
}

export function paceTitle(dayLabel: string): string {
  if (dayLabel === "Today" || dayLabel === "Tomorrow") return `${dayLabel}'s pace`;
  return `Pace for ${dayLabel}`;
}

// ─── Kit ─────────────────────────────────────────────────────────────────────
/** The temperature the runner should dress for, given effort and the runs-hot preference. */
export function dressingFor(apparentF: number, effort: EffortLevel, runsHot: boolean): number {
  return getRunnerFeelsLike(apparentF) - 15 + EFFORT_HEAT_OFFSET[effort] + (runsHot ? 5 : 0);
}

// ─── Hour bands ──────────────────────────────────────────────────────────────
/** Bands are relative to the day, so the words say so. */
export const BAND_LABELS = ["among the day's best", "better than most", "middle of the day", "worse than most", "among the day's worst"] as const;

/**
 * Rank hours against each other (lower score is better) into five bands, 0 best.
 * Ranking rather than a linear scale, so the overnight penalty doesn't flatten
 * the daytime differences.
 */
export function bandsFor(scores: Map<string, number>): Map<string, number> {
  const sorted = [...scores.values()].sort((a, b) => a - b);
  const n = sorted.length;
  const rankOf = (v: number) => (sorted.indexOf(v) + sorted.lastIndexOf(v)) / 2; // ties share the average rank
  return new Map([...scores].map(([t, v]) => [t, n <= 1 ? 0 : Math.min(4, Math.floor((rankOf(v) / n) * 5))]));
}

/** Band only the hours still ahead; earlier hours today get no band (they've passed). */
export function bandsAhead(scores: Map<string, number>, now: Date): Map<string, number> {
  const startOfHour = new Date(now);
  startOfHour.setMinutes(0, 0, 0);
  const ahead = [...scores].filter(([t]) => new Date(t) >= startOfHour);
  return ahead.length ? bandsFor(new Map(ahead)) : new Map();
}

export function bandWord(band: number | undefined): string {
  return band === undefined ? "already passed" : `${BAND_LABELS[band]} for running`;
}

/** Bar length (percent) for a band: longer is better. */
export function bandBarPercent(band: number): number {
  return (5 - band) * 20;
}

// ─── Windows and default hour ────────────────────────────────────────────────
export function windowHours(bw: BestWindowResult): { best: Set<string>; good: Set<string> } {
  const best = new Set<string>();
  const good = new Set<string>();
  bw.ranked.forEach((w, i) => (i === 0 ? best : good).add(w.startHour));
  return { best, good };
}

/** The verdict defaults to the day's best window; otherwise now (today) or 8 AM. */
export function defaultHourIndex(hours: HourlyWeather[], bestStart: string, isToday: boolean, now: Date): number {
  const bestIdx = hours.findIndex((h) => h.time === bestStart);
  if (bestIdx !== -1) return bestIdx;
  const target = isToday ? now.getHours() : 8;
  const idx = hours.findIndex((h) => new Date(h.time).getHours() >= target);
  return idx === -1 ? Math.max(0, hours.length - 1) : idx;
}
