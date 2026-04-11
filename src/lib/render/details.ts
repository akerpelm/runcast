/**
 * Render: Run Windows
 */
import type { HourBriefing, RenderContext } from "../state";
import type { BestWindowResult } from "../formulas/best-window";
import { EFFORT_LABELS } from "../state";
import { esc, distDisplay } from "../display";
import { formatTime } from "../formulas/daylight";

export function renderDetailsRow(b: HourBriefing, bw: BestWindowResult, ctx: RenderContext): string {
  // Distance-before-sunset context
  let sunsetNote = "";
  const activePace = ctx.paces[ctx.selectedEffort] || ctx.paces.easy;
  if (activePace > 0) {
    const hourTime = new Date(b.hour.time);
    const sunset = new Date(b.daily.sunset);
    const minsToSunset = (sunset.getTime() - hourTime.getTime()) / 60000;
    if (minsToSunset > 0 && minsToSunset < 480) {
      const miles = minsToSunset / (activePace / 60);
      sunsetNote = `<p class="mt-2 text-xs text-muted-foreground">~${distDisplay(miles, ctx.useMetric)} at ${EFFORT_LABELS[ctx.selectedEffort].toLowerCase()} pace before sunset</p>`;
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
      <span class="text-sm font-data ${isPrimary ? "font-bold text-foreground" : "font-medium text-muted-foreground"}">${start} – ${end}</span>
      <span class="text-xs text-muted-foreground">${esc(w.summary)}</span>
    </div>`;
  }).join("");

  return `
    <div class="bg-card text-card-foreground card-surface flex flex-col gap-4 py-4 px-4" data-slot="card" data-size="sm">
      <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Run Windows</p>
      ${windowRows || '<p class="text-xs text-muted-foreground">No data available</p>'}
      ${sunsetNote}
    </div>`;
}
