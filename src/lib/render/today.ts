/**
 * Render: the Today screen (verdict, lanes, hours, kit) and the sheet bodies
 * that show the same data in full. Pure HTML-string functions over computed
 * briefings; no scoring happens here.
 */
import type { HourBriefing, RenderContext } from "../state";
import { EFFORTS, EFFORT_LABELS, EFFORT_HEAT_OFFSET } from "../state";
import type { BestWindowResult } from "../formulas/best-window";
import type { SafetyAlert } from "../formulas/safety";
import type { HourlyWeather } from "../weather";
import { esc, getDayLabel, tempDisplay, tempDeltaDisplay, speedDisplay, paceUnit, distDisplay } from "../display";
import { getConditionIcon, getConditionLabel, hazardMark, clockIcon, shirtIcon, flagIcon, checkIcon } from "../icons";
import { formatTime } from "../formulas/daylight";
import { getRunnerFeelsLike } from "../formulas/clothing";

// ─── Small helpers ──────────────────────────────────────────────────────────
function hourParts(d: Date): { h: string; ap: string } {
  const hr = d.getHours();
  const m = d.getMinutes();
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return { h: m ? `${h12}:${String(m).padStart(2, "0")}` : `${h12}`, ap: hr < 12 ? "AM" : "PM" };
}

/** "6–7 AM", "11 AM–12 PM" */
export function timeRange(startISO: string, endISO: string): string {
  const a = hourParts(new Date(startISO));
  const b = hourParts(new Date(endISO));
  return a.ap === b.ap ? `${a.h}–${b.h} ${b.ap}` : `${a.h} ${a.ap}–${b.h} ${b.ap}`;
}

function shortHour(d: Date): string {
  const hr = d.getHours();
  if (hr === 0) return "12a";
  if (hr === 12) return "12p";
  return hr < 12 ? `${hr}a` : `${hr - 12}p`;
}

function isNightHour(time: string, sunrise: string, sunset: string): boolean {
  return time < sunrise || time >= sunset;
}

const RUN_TYPE_COPY: Record<string, string> = {
  ANY: "Any workout goes",
  MODERATE_TO_HARD: "Good day to push the pace",
  MODERATE: "Moderate effort",
  EASY: "Keep it easy",
  TREADMILL_OR_EASY: "Easy outside, or take it inside",
  TREADMILL: "Rough out there. Take it inside",
};

export type VerdictInput = {
  b: HourBriefing;
  bw: BestWindowResult;
  ctx: RenderContext;
  isBestHour: boolean;
  dayLabel: string;
  animate: boolean;
};

// ─── Verdict (infield) ──────────────────────────────────────────────────────
function headline({ b, bw, isBestHour }: VerdictInput): string {
  if (b.runType.type === "TREADMILL") return "Treadmill day";
  const best = bw.ranked[0];
  if (isBestHour && best) return `Run ${timeRange(best.startHour, best.endHour)}`;
  const p = hourParts(new Date(b.hour.time));
  return `Run at ${p.h} ${p.ap}`;
}

function daylightNote(b: HourBriefing): string | null {
  const t = b.hour.time;
  if (isNightHour(t, b.daily.sunrise, b.daily.sunset)) return "Dark. Wear lights";
  const toSunset = (new Date(b.daily.sunset).getTime() - new Date(t).getTime()) / 60000;
  if (toSunset > 0 && toSunset <= 60) return `Sunset ${b.daylight.sunset}`;
  return null;
}

function hazardRow(a: SafetyAlert): string {
  return `<li class="flex gap-3">
    ${hazardMark(a.severity)}
    <p class="min-w-0 line-clamp-2 lg:line-clamp-none"><span class="font-semibold">${esc(a.title)}.</span> <span class="text-infield-muted">${esc(a.message)}</span></p>
  </li>`;
}

export function renderVerdict(v: VerdictInput): string {
  const { b, ctx, dayLabel } = v;
  const td = (f: number) => tempDisplay(f, ctx.useCelsius);
  const sd = (mph: number) => speedDisplay(mph, ctx.useMetric);
  const indoor = b.runType.type === "TREADMILL";
  const h = b.hour;

  const facts = [
    `${td(h.temperature)}, feels ${td(h.apparentTemperature)}`,
    getConditionLabel(h.weatherCode),
    h.windSpeed >= 5 ? `wind ${sd(h.windSpeed)}` : "calm",
  ];
  const dark = daylightNote(b);
  if (dark) facts.push(dark);

  const alerts = b.safetyAlerts.filter((a) => a.severity !== "info").slice(0, 2);
  const extra = b.safetyAlerts.length - alerts.length;
  const hazards = alerts.length
    ? `<ul class="mt-4 space-y-3 border-t border-white/20 pt-4 text-[0.95rem] leading-snug">${alerts.map(hazardRow).join("")}</ul>`
    : "";
  const more = extra > 0
    ? `<button type="button" data-action="open-sheet" data-sheet="hours" class="press mt-3 inline-flex min-h-11 items-center rounded-full bg-white/15 px-4 text-sm font-semibold hover:bg-white/25">${extra} more condition note${extra > 1 ? "s" : ""}</button>`
    : "";
  const kit = [b.clothing.bottom, b.clothing.top, ...b.clothing.accessories].join(", ");

  return `<section aria-labelledby="verdict-title" data-surface="color" class="${v.animate ? "verdict-enter " : ""}relative z-10 rounded-[20px] px-5 pt-5 pb-6 text-white shadow-[var(--shadow-raised)] ${indoor ? "bg-indoor" : "bg-infield"}">
    <h2 id="verdict-title" class="font-(--font-display) text-[3.25rem] leading-[0.92] font-extrabold uppercase tracking-[-0.01em] sm:text-[4rem]">${esc(headline(v))}</h2>
    <p class="mt-3 text-lg font-semibold">${esc(RUN_TYPE_COPY[b.runType.type] ?? b.runType.reason)}<span class="font-normal text-infield-muted"> \u00b7 ${v.isBestHour ? `${esc(dayLabel.toLowerCase() === "today" ? "today's" : dayLabel)} best window` : "your chosen hour"}</span></p>
    <p class="mt-1 text-[0.95rem] text-infield-muted">${facts.map(esc).join(" · ")}</p>
    ${hazards}
    ${more}
    <button type="button" data-action="open-sheet" data-sheet="kit" class="press mt-4 flex w-full items-start gap-3 rounded-[14px] bg-black/15 px-3.5 py-3 text-left hover:bg-black/25 lg:hidden">
      <span class="mt-0.5 shrink-0">${shirtIcon}</span>
      <span class="min-w-0"><span class="block text-sm text-infield-muted">Wear</span><span class="block text-[0.95rem] font-semibold">${esc(kit)}</span></span>
    </button>
  </section>`;
}

// ─── Lanes (pace per effort) ────────────────────────────────────────────────
function paceAdjLabel(b: HourBriefing): string {
  const adj = b.paceAdjustment;
  if (adj.warning) return adj.warning;
  const wind = b.hour.windSpeed > 10;
  if (adj.min === 0 && adj.max === 0) return wind ? "Wind adjusted" : "No adjustment today";
  const range = adj.max === Infinity || adj.max === adj.min ? `+${adj.min}%` : `+${adj.min}–${adj.max}%`;
  return `${range} for ${adj.type}${wind ? " and wind" : ""}`;
}

export function renderLanes(b: HourBriefing, ctx: RenderContext, opts: { animate: boolean; sample: boolean }): string {
  const animateLane = opts.animate;
  const pu = paceUnit(ctx.useMetric);
  const hasAny = b.adjustedPaces.length > 0;
  const byEffort = new Map(b.adjustedPaces.map((p) => [p.effort, p]));

  const lanes = EFFORTS.map((e, i) => {
    const sel = e === ctx.selectedEffort;
    const p = byEffort.get(e);
    const pace = p
      ? `<span class="flex flex-col items-end leading-none"><span class="whitespace-nowrap font-(--font-display) text-[1.4rem] font-bold">${esc(p.adjusted)}<span class="ml-0.5 font-(--font-body) text-xs font-medium text-track-muted">${pu}</span></span><span class="mt-1 text-xs text-track-muted">from <s class="decoration-1">${esc(p.base)}</s></span></span>`
      : `<span class="text-sm text-track-muted">No pace set</span>`;
    return `<li class="relative">
      <button type="button" data-action="select-effort" data-effort="${e}" aria-pressed="${sel}"
        class="press group relative grid min-h-[3.25rem] w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center border-t-2 border-white/90 pr-4 text-left text-track-ink ${sel ? "" : "hover:bg-black/10"}">
        ${sel ? `<span class="${animateLane ? "lane-settle " : ""}absolute inset-0 bg-track-deep" aria-hidden="true"></span>` : ""}
        <span class="relative flex h-full items-center justify-center border-r-2 border-white/90 font-(--font-display) text-2xl font-extrabold">${i + 1}</span>
        <span class="relative pl-3 text-base font-semibold">${EFFORT_LABELS[e]}${sel ? `<span class="sr-only"> (selected)</span>` : ""}</span>
        <span class="relative">${pace}</span>
      </button>
    </li>`;
  }).join("");

  const footer = opts.sample
    ? `<span class="rounded-full bg-black/15 px-3 py-1 text-sm font-semibold">Sample paces</span>`
    : hasAny
    ? `<button type="button" data-action="open-sheet" data-sheet="paces" class="press min-h-11 rounded-full px-4 text-sm font-semibold text-track-ink underline decoration-white/50 underline-offset-4 hover:bg-black/10">Edit paces</button>`
    : `<button type="button" data-action="open-sheet" data-sheet="paces" class="press min-h-11 rounded-full bg-white px-4 text-sm font-bold text-track-deep hover:bg-white/90">Add your paces</button>`;

  return `<section aria-labelledby="lanes-title" data-surface="color" class="-mt-4 rounded-b-[20px] bg-track pt-4 text-track-ink">
    <div class="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-2">
      <div>
        <h2 id="lanes-title" class="font-(--font-display) text-lg font-bold uppercase tracking-[0.04em]">Today's pace</h2>
        <p class="text-sm text-track-muted">${esc(paceAdjLabel(b))}${hasAny ? "" : ". Add your paces to see adjusted times"}</p>
      </div>
      ${footer}
    </div>
    <ul class="pb-2" aria-label="Effort lanes. Selecting one adjusts your kit.">${lanes}</ul>
  </section>`;
}

// ─── Day tabs ───────────────────────────────────────────────────────────────
export function renderDayTabs(ctx: RenderContext): string {
  const tabs = ctx.availableDays.map((d) => {
    const active = d.date === ctx.selectedDayDate;
    return `<button type="button" data-action="select-day" data-day="${d.date}" aria-pressed="${active}"
      class="press shrink-0 min-h-11 rounded-full px-4 text-sm font-semibold ${active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}">${esc(getDayLabel(d.date))}</button>`;
  }).join("");
  return `<nav aria-label="Choose a day" id="day-tabs-scroll" class="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-3">${tabs}</nav>`;
}

// ─── Hour strip ─────────────────────────────────────────────────────────────
function windowHours(bw: BestWindowResult): { best: Set<string>; good: Set<string> } {
  const best = new Set<string>();
  const good = new Set<string>();
  bw.ranked.forEach((w, i) => (i === 0 ? best : good).add(w.startHour));
  return { best, good };
}

export function renderHourStrip(b: HourBriefing, bw: BestWindowResult, ctx: RenderContext): string {
  const td = (f: number) => tempDisplay(f, ctx.useCelsius);
  const { best, good } = windowHours(bw);
  const now = new Date();
  const items = ctx.displayHours.map((hr, idx) => {
    const sel = idx === ctx.selectedHourIndex;
    const d = new Date(hr.time);
    const isNow = d.getHours() === now.getHours() && d.toDateString() === now.toDateString();
    const isBest = best.has(hr.time);
    const isGood = good.has(hr.time);
    const night = isNightHour(hr.time, b.daily.sunrise, b.daily.sunset);
    const ring = isBest ? "ring-[3px] ring-window" : isGood ? "outline-2 outline-dashed outline-window -outline-offset-2" : "";
    // Visible text stays in the accessible name (WCAG 2.5.3); extra context is screen-reader only.
    const extra = `, ${getConditionLabel(hr.weatherCode)}${hr.precipProbability >= 30 ? `, ${hr.precipProbability}% rain` : ""}${isBest ? ", best window" : isGood ? ", also good" : ""}`;
    return `<li><button type="button" data-action="select-hour" data-hour-index="${idx}" aria-pressed="${sel}" ${sel ? "data-selected-pill" : ""}
      class="press relative flex h-[5.5rem] w-[3.75rem] flex-col items-center justify-center gap-1 rounded-[14px] ${sel ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-muted"} ${ring}">
      <span class="text-xs font-semibold ${sel ? "" : isNow ? "text-primary" : "text-muted-foreground"}">${isNow ? "Now" : shortHour(d)}</span>
      ${getConditionIcon(hr.weatherCode, "h-5 w-5", night)}
      <span class="text-[0.95rem] font-bold">${td(hr.temperature)}<span class="sr-only">${esc(extra)}</span></span>
      ${hr.precipProbability >= 30 ? `<span aria-hidden="true" class="absolute -top-2 rounded-full bg-background px-1.5 text-[0.7rem] font-bold text-foreground ring-1 ring-hair">${hr.precipProbability}%</span>` : ""}
    </button></li>`;
  }).join("");

  const legend = `<p class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
    <span class="inline-flex items-center gap-2"><span class="inline-block h-3.5 w-3.5 rounded ring-[3px] ring-window"></span>Best window</span>
    ${good.size ? `<span class="inline-flex items-center gap-2"><span class="inline-block h-3.5 w-3.5 rounded outline-2 outline-dashed outline-window -outline-offset-2"></span>Also good</span>` : ""}
  </p>`;

  return `<section aria-labelledby="hours-title" class="mt-6">
    <div class="flex items-center justify-between">
      <h2 id="hours-title" class="font-(--font-display) text-lg font-bold uppercase tracking-[0.04em]">Hour by hour</h2>
      <button type="button" data-action="open-sheet" data-sheet="hours" class="press min-h-11 rounded-full px-3 text-sm font-semibold text-primary hover:bg-muted lg:hidden">Details</button>
    </div>
    <ul id="timeline-scroll" class="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto scroll-px-4 px-4 pt-3 pb-1" style="scroll-snap-type:x proximity">${items}</ul>
    ${legend}
  </section>`;
}

// ─── Kit ────────────────────────────────────────────────────────────────────
function dressingFor(b: HourBriefing, ctx: RenderContext): number {
  const effortOffset = EFFORT_HEAT_OFFSET[ctx.selectedEffort];
  return getRunnerFeelsLike(b.hour.apparentTemperature) - 15 + effortOffset + (ctx.runsHot ? 5 : 0);
}

export function renderKitLine(b: HourBriefing, ctx: RenderContext): string {
  const items = [b.clothing.bottom, b.clothing.top, ...b.clothing.accessories];
  return `<section aria-labelledby="kit-title" class="mt-6 hidden lg:block">
    <div class="flex items-center justify-between">
      <h2 id="kit-title" class="font-(--font-display) text-lg font-bold uppercase tracking-[0.04em]">Wear</h2>
      <button type="button" data-action="open-sheet" data-sheet="kit" class="press min-h-11 rounded-full px-3 text-sm font-semibold text-primary hover:bg-muted lg:hidden">Why this kit</button>
    </div>
    <p class="mt-1 text-sm text-muted-foreground">Dressing for ${tempDisplay(dressingFor(b, ctx), ctx.useCelsius)} at ${EFFORT_LABELS[ctx.selectedEffort].toLowerCase()} effort${ctx.runsHot ? ", runs hot" : ""}</p>
    <ul class="mt-3 flex flex-wrap gap-2">${items.map((i) => `<li class="rounded-full border border-hair bg-card px-3.5 py-2 text-[0.95rem] font-semibold">${esc(i)}</li>`).join("")}</ul>
  </section>`;
}

/** Full kit with alternatives and the reason for each item. */
export function renderKitFull(b: HourBriefing, ctx: RenderContext): string {
  const h = b.hour;
  const td = (f: number) => tempDisplay(f, ctx.useCelsius);
  const sd = (mph: number) => speedDisplay(mph, ctx.useMetric);
  const target = dressingFor(b, ctx);
  const visMi = h.visibility / 1609;

  function reason(item: string): string {
    if (item.includes("Wind-resistant")) return `${sd(h.windSpeed)} wind`;
    if (item.includes("Water-resistant") || item.includes("Waterproof")) return `${h.precipProbability}% chance of rain`;
    if (item === "Sunscreen") return `UV ${h.uvIndex}`;
    if (item.includes("Brimmed cap")) return "Cold rain";
    if (item === "High-vis vest" || item === "Reflective vest" || item === "Headlamp") {
      return visMi < 3 ? `Visibility ${visMi < 1 ? "under 1" : Math.round(visMi)} mi` : "After dark";
    }
    if (item.includes("Balaclava") || item.includes("Face coverage")) return `Wind chill ${td(b.windChill)}`;
    if ((item === "Lightweight cap" || item === "Sunglasses") && h.uvIndex >= 6) return `UV ${h.uvIndex}`;
    return `For ${td(target)}`;
  }

  const zone = (label: string, main: string, alts: string[]) => `<div class="border-t border-hair py-4">
    <h3 class="text-sm font-semibold text-muted-foreground">${label}</h3>
    <p class="mt-1 text-lg font-bold">${esc(main)}</p>
    <p class="text-sm text-muted-foreground">${esc(reason(main))}${alts.length ? ` · or ${alts.map(esc).join(", ")}` : ""}</p>
  </div>`;

  const extras = b.clothing.accessories.length
    ? `<div class="border-t border-hair py-4"><h3 class="text-sm font-semibold text-muted-foreground">Extras</h3>
        <ul class="mt-2 space-y-2">${b.clothing.accessories.map((a) => `<li class="flex items-baseline justify-between gap-4"><span class="text-base font-semibold">${esc(a)}</span><span class="text-sm text-muted-foreground">${esc(reason(a))}</span></li>`).join("")}</ul></div>`
    : "";

  const effortOffset = EFFORT_HEAT_OFFSET[ctx.selectedEffort];
  const math = `Feels like ${td(h.apparentTemperature)}, plus ${tempDeltaDisplay(effortOffset, ctx.useCelsius)} for ${EFFORT_LABELS[ctx.selectedEffort].toLowerCase()} effort${ctx.runsHot ? `, plus ${tempDeltaDisplay(5, ctx.useCelsius)} because you run hot` : ""}: dress for ${td(target)}.`;

  return `<p class="text-[0.95rem] text-muted-foreground">${esc(math)}</p>
    <div class="mt-3">${zone("Legs", b.clothing.bottom, b.clothing.bottomAlts || [])}${zone("Torso", b.clothing.top, b.clothing.topAlts || [])}${extras}</div>`;
}

// ─── Hour detail (sheet + desktop aside) ────────────────────────────────────
export function renderWindows(bw: BestWindowResult, b: HourBriefing, ctx: RenderContext): string {
  if (!bw.ranked.length) return `<p class="text-sm text-muted-foreground">No run windows left for this day.</p>`;
  const rows = bw.ranked.map((w) => `<li class="flex items-start gap-3 border-t border-hair py-3">
    <span class="mt-0.5 inline-flex min-w-14 justify-center rounded-full px-2 py-0.5 text-xs font-bold ${w.label === "Best" ? "bg-infield text-white" : "border border-hair text-foreground"}">${esc(w.label)}</span>
    <div><p class="text-base font-bold">${esc(timeRange(w.startHour, w.endHour))}</p><p class="text-sm text-muted-foreground">${esc(w.summary)}</p></div>
  </li>`).join("");

  let sunsetNote = "";
  const pace = ctx.paces[ctx.selectedEffort] || ctx.paces.easy;
  const minsToSunset = (new Date(b.daily.sunset).getTime() - new Date(b.hour.time).getTime()) / 60000;
  if (pace > 0 && minsToSunset > 0 && minsToSunset < 480) {
    sunsetNote = `<p class="mt-2 text-sm text-muted-foreground">About ${distDisplay(minsToSunset / (pace / 60), ctx.useMetric)} at ${EFFORT_LABELS[ctx.selectedEffort].toLowerCase()} pace before sunset.</p>`;
  }
  return `<ul>${rows}</ul>${sunsetNote}`;
}

export function renderConditions(b: HourBriefing, ctx: RenderContext): string {
  const h = b.hour;
  const td = (f: number) => tempDisplay(f, ctx.useCelsius);
  const sd = (mph: number) => speedDisplay(mph, ctx.useMetric);
  const visMi = h.visibility / 1609;
  const rows: [string, string][] = [
    ["Temperature", `${td(h.temperature)} (feels ${td(h.apparentTemperature)})`],
    ["Wind", `${sd(h.windSpeed)}, gusts ${sd(h.windGusts)}`],
    ["Rain chance", `${h.precipProbability}%`],
    ["Humidity", `${Math.round(h.humidity)}% · dew point ${td(h.dewPoint)}`],
    ["UV index", `${h.uvIndex}`],
    ["Air quality", b.aqiForHour !== undefined ? `AQI ${b.aqiForHour} · ${b.aqiCategory}` : "Not available"],
    ["Visibility", ctx.useMetric ? `${(h.visibility / 1000).toFixed(0)} km` : `${visMi.toFixed(0)} mi`],
    ["Daylight", `${b.daylight.sunrise} to ${b.daylight.sunset}`],
  ];
  if (b.nextThunderstorm) rows.push(["Thunderstorm", `${getDayLabel(b.nextThunderstorm.slice(0, 10))} ${formatTime(new Date(b.nextThunderstorm))}`]);
  else if (b.nextRain) rows.push(["Next rain", `${getDayLabel(b.nextRain.time.slice(0, 10))} ${formatTime(new Date(b.nextRain.time))} (${b.nextRain.prob}%)`]);

  const notes = b.safetyAlerts.length
    ? `<ul class="mb-4 space-y-3">${b.safetyAlerts.map((a) => `<li class="flex gap-3">${hazardMark(a.severity)}<p><span class="font-semibold">${esc(a.title)}.</span> <span class="text-muted-foreground">${esc(a.message)}</span></p></li>`).join("")}</ul>`
    : `<p class="mb-4 flex items-center gap-2 text-[0.95rem] font-semibold text-infield dark:text-secondary">${checkIcon} No safety concerns for this hour</p>`;

  return `${notes}
    <p class="mb-2 text-[0.95rem]"><span class="font-semibold">Why this call:</span> <span class="text-muted-foreground">${esc(b.runType.reason)}</span></p>
    <dl class="grid grid-cols-[auto_1fr] gap-x-6">${rows.map(([k, v]) => `<dt class="border-t border-hair py-2.5 text-sm text-muted-foreground">${k}</dt><dd class="border-t border-hair py-2.5 text-right text-[0.95rem] font-semibold">${esc(v)}</dd>`).join("")}</dl>`;
}

/** Full-day hour table; rows select the hour. */
export function renderHourTable(b: HourBriefing, bw: BestWindowResult, ctx: RenderContext): string {
  const td = (f: number) => tempDisplay(f, ctx.useCelsius);
  const sd = (mph: number) => speedDisplay(mph, ctx.useMetric);
  const { best, good } = windowHours(bw);
  const rows = ctx.displayHours.map((hr: HourlyWeather, idx) => {
    const sel = idx === ctx.selectedHourIndex;
    const d = new Date(hr.time);
    const tag = best.has(hr.time) ? `<span class="rounded-full bg-infield px-2 py-0.5 text-xs font-bold text-white">Best</span>` : good.has(hr.time) ? `<span class="rounded-full border border-hair px-2 py-0.5 text-xs font-bold">Good</span>` : "";
    return `<li><button type="button" data-action="select-hour" data-hour-index="${idx}" aria-pressed="${sel}"
      class="press grid min-h-12 w-full grid-cols-[4rem_1.5rem_3.5rem_1fr_auto] items-center gap-2 rounded-[10px] px-2 text-left text-[0.95rem] ${sel ? "bg-foreground text-background" : "hover:bg-muted"}">
      <span class="font-semibold">${formatTime(d).replace(":00", "")}</span>
      ${getConditionIcon(hr.weatherCode, "h-5 w-5", isNightHour(hr.time, b.daily.sunrise, b.daily.sunset))}
      <span class="font-bold">${td(hr.temperature)}</span>
      <span class="truncate text-sm ${sel ? "" : "text-muted-foreground"}">${sd(hr.windSpeed)}${hr.precipProbability >= 20 ? ` · ${hr.precipProbability}% rain` : ""}</span>
      ${tag}
    </button></li>`;
  }).join("");
  return `<ul class="space-y-0.5">${rows}</ul>`;
}

// ─── Dock (thumb reach) ─────────────────────────────────────────────────────
export function renderDock(logged: boolean): string {
  const btn = (sheet: string, icon: string, label: string, extra = "") =>
    `<button type="button" data-action="open-sheet" data-sheet="${sheet}" class="press flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-sm font-semibold hover:bg-muted ${extra}">${icon}<span>${label}</span></button>`;
  return `<nav aria-label="Quick actions" class="pad-safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-background/95 px-3 pt-2 backdrop-blur-sm lg:hidden">
    <div class="mx-auto flex max-w-md gap-1">
      ${btn("hours", clockIcon, "Hours")}
      ${btn("kit", shirtIcon, "Kit")}
      ${btn("log", logged ? checkIcon : flagIcon, logged ? "Logged" : "Log run", logged ? "text-muted-foreground" : "")}
    </div>
  </nav>`;
}

export function renderLogRow(logged: boolean): string {
  return `<div class="mt-6 hidden items-center justify-between border-t border-hair pt-4 lg:flex">
    <p class="text-[0.95rem] text-muted-foreground">${logged ? "Today's run is logged." : "Ran today? A quick log tunes your kit picks."}</p>
    <button type="button" data-action="open-sheet" data-sheet="log" class="press min-h-11 rounded-full border border-foreground px-5 text-sm font-semibold hover:bg-foreground hover:text-background">${logged ? "View log" : "Log run"}</button>
  </div>`;
}
