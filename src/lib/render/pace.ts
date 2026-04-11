/**
 * Render: Pace & Effort
 */
import type { HourBriefing, RenderContext } from "../state";
import { EFFORTS, EFFORT_LABELS } from "../state";
import { esc, speedDisplay, paceUnit, paceForDisplay } from "../display";
import { formatPace, windImpactSeconds } from "../formulas/pace";
import { settingsIcon } from "../icons";
import { htmlBadge, htmlCard, htmlButton } from "./starwind-html";

export function renderPaceEffort(b: HourBriefing, ctx: RenderContext): string {
  const h = b.hour;
  const pu = paceUnit(ctx.useMetric);
  const sd = (mph: number) => speedDisplay(mph, ctx.useMetric);
  const pfd = (sec: number) => paceForDisplay(sec, ctx.useMetric);

  // Effort pills — use Starwind badge pattern
  const effortPills = EFFORTS.map(e => {
    const active = e === ctx.selectedEffort;
    const hasPace = ctx.paces[e] > 0;
    if (active) {
      return `<button data-action="select-effort" data-effort="${e}" class="starwind-badge inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap bg-primary text-primary-foreground px-2.5 py-0.5 text-xs" data-slot="badge">${EFFORT_LABELS[e]}</button>`;
    }
    return `<button data-action="select-effort" data-effort="${e}" class="starwind-badge inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap px-2.5 py-0.5 text-xs transition-colors ${hasPace ? "bg-foreground/10 text-foreground hover:bg-foreground/15" : "text-foreground/75 hover:text-foreground"}" data-slot="badge">${EFFORT_LABELS[e]}</button>`;
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
      const isActive = p.effort === ctx.selectedEffort;
      return `<tr class="${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}">
        <td class="py-0.5 pr-3 text-xs">${p.label}</td>
        <td class="py-0.5 pr-3 text-xs font-data">${p.base}${pu}</td>
        <td class="py-0.5 text-xs font-data">${p.adjusted}${pu}</td>
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
      <div class="mt-3 border-t border-border pt-3">
        <p class="text-xs text-muted-foreground">${pctStr}</p>
        <div class="mt-2 rounded-[var(--radius-inner)] card-inset p-3 text-center">
          <p class="text-xs font-medium text-foreground">Set your paces to see adjusted times</p>
          <p class="mt-0.5 text-xs text-muted-foreground">E.g. "Your 8:00${pu} becomes 8:39${pu} today"</p>
          ${htmlButton("Enter paces", { variant: "primary", size: "sm", dataAction: "toggle-settings", class: "mt-2" })}
        </div>
      </div>`;
  }

  // Wind impact note
  let windNote = "";
  if (h.windSpeed > 10) {
    const headwindPenaltyRaw = windImpactSeconds(h.windSpeed, true);
    const headwindPenalty = Math.round(ctx.useMetric ? headwindPenaltyRaw / 1.609 : headwindPenaltyRaw);
    windNote = `<p class="mt-2 text-xs text-muted-foreground">Wind impact: ~${headwindPenalty}s${pu} headwind penalty at ${sd(h.windSpeed)}</p>`;
  }

  // Settings panel
  const isOpen = ctx.settingsOpen;
  let settingsPanel = "";
  if (isOpen) {
    const paceInputs = EFFORTS.map(e => {
      const val = ctx.paces[e] > 0 ? formatPace(pfd(ctx.paces[e])) : "";
      return `<div>
        <label class="mb-0.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground" for="pace-${e}">${EFFORT_LABELS[e]}${e === "easy" ? " *" : ""}</label>
        <input id="pace-${e}" data-pace-effort="${e}" type="text" placeholder="m:ss${pu}"
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
            <button data-action="toggle-runs-hot" class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${ctx.runsHot ? "bg-primary" : "bg-muted"}" role="switch" aria-checked="${ctx.runsHot}">
              <span class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${ctx.runsHot ? "translate-x-4" : "translate-x-0.5"}"></span>
            </button>
          </label>
          ${htmlButton("Save", { variant: "primary", size: "sm", dataAction: "save-paces" })}
        </div>
      </div>`;
  }

  // Hot tag using Starwind badge
  const hotTag = ctx.runsHot ? htmlBadge("Hot", { variant: "warning", size: "sm" }) : "";

  return `
    <div class="bg-card text-card-foreground card-surface flex flex-col gap-4 py-4 px-4" data-slot="card" data-size="sm">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-foreground">Pace & Effort</p>
          <p class="text-[11px] text-muted-foreground">Adjusts clothing, sunset distance, and run type</p>
        </div>
        <div class="flex items-center gap-2">
          ${hotTag}
          <button data-action="toggle-settings" class="flex h-6 w-6 items-center justify-center rounded-[var(--radius-inner)] text-muted-foreground transition-colors hover:text-foreground ${isOpen ? "card-inset" : "hover:bg-muted"}" aria-label="Settings">${settingsIcon}</button>
        </div>
      </div>
      <div class="flex gap-1.5 overflow-x-auto pb-1">${effortPills}</div>
      ${paceSection}
      ${windNote}
      ${settingsPanel}
    </div>`;
}
