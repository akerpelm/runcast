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
      sunsetNote = `<p class="mt-3 text-xs text-muted-foreground">~${distDisplay(miles, ctx.useMetric)} at ${EFFORT_LABELS[ctx.selectedEffort].toLowerCase()} pace before sunset</p>`;
    }
  }

  // Ranked windows — use a structured layout to prevent overlap
  const windowRows = bw.ranked.map(w => {
    const start = w.startHour ? formatTime(new Date(w.startHour)) : "--";
    const end = w.endHour ? formatTime(new Date(w.endHour)) : "--";
    const isPrimary = w.label === "Best";
    return `<div class="${isPrimary ? "" : "mt-2"}">
      <div class="flex items-baseline gap-2 flex-wrap">
        <span class="text-[0.65rem] font-bold uppercase tracking-[0.05em] ${isPrimary ? "text-primary" : "text-muted-foreground"}">${w.label}</span>
        <span class="text-sm font-data ${isPrimary ? "font-bold text-foreground" : "font-medium text-muted-foreground"}">${start} \u2013 ${end}</span>
      </div>
      <p class="mt-0.5 text-xs text-muted-foreground">${esc(w.summary)}</p>
    </div>`;
  }).join("");

  return `
    <div class="bg-card text-card-foreground card-surface p-5 min-w-0" data-slot="card">
      <p class="text-[0.65rem] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-3">Run Windows</p>
      ${windowRows || '<p class="text-xs text-muted-foreground">No data available</p>'}
      ${sunsetNote}
    </div>`;
}
