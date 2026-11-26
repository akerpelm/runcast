/**
 * Render: bodies for the form sheets (paces, settings, location).
 */
import type { RenderContext } from "../state";
import { EFFORTS, EFFORT_LABELS } from "../state";
import { esc, paceUnit, paceForDisplay } from "../display";
import { formatPace } from "../formulas/pace";
import { crosshairIcon, searchIcon } from "../icons";

const field = "h-12 w-full rounded-[12px] border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-outline focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-1";
const primaryBtn = "press inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 text-base font-bold text-background hover:opacity-90";

function segmented(name: string, label: string, options: { value: string; label: string }[], current: string): string {
  return `<fieldset class="border-t border-hair py-4">
    <legend class="float-left mb-2 w-full text-sm font-semibold text-muted-foreground">${label}</legend>
    <div class="clear-both grid gap-1 rounded-full bg-muted p-1" style="grid-template-columns:repeat(${options.length},1fr)">
      ${options.map((o) => `<button type="button" data-action="${name}" data-value="${o.value}" aria-pressed="${o.value === current}"
        class="press min-h-11 rounded-full text-[0.95rem] font-semibold ${o.value === current ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}">${o.label}</button>`).join("")}
    </div>
  </fieldset>`;
}

export function renderPacesSheet(ctx: RenderContext): string {
  const pu = paceUnit(ctx.useMetric);
  const inputs = EFFORTS.map((e, i) => {
    const val = ctx.paces[e] > 0 ? formatPace(paceForDisplay(ctx.paces[e], ctx.useMetric)) : "";
    return `<div class="grid grid-cols-[2.5rem_1fr_7.5rem] items-center gap-3 border-t border-hair py-2">
      <span class="flex h-11 items-center justify-center rounded-[10px] bg-track font-(--font-display) text-xl font-extrabold text-track-ink" aria-hidden="true">${i + 1}</span>
      <label for="pace-${e}" class="text-base font-semibold">${EFFORT_LABELS[e]}<span class="block text-sm font-normal text-muted-foreground">min:sec ${pu}</span></label>
      <input id="pace-${e}" data-pace-effort="${e}" type="text" inputmode="numeric" autocomplete="off" placeholder="${e === "easy" ? (ctx.useMetric ? "5:00" : "8:00") : "optional"}" value="${esc(val)}" class="${field} text-center font-semibold" />
    </div>`;
  }).join("");

  return `<p class="text-[0.95rem] text-muted-foreground">Enter the paces you train at. Each lane shows how today's weather changes them.</p>
    <div class="mt-3">${inputs}</div>
    <p id="pace-error" class="mt-2 min-h-5 text-sm font-semibold text-error" role="alert"></p>
    <div class="flex items-center justify-between gap-4 border-t border-hair py-4">
      <span id="runs-hot-label" class="text-base font-semibold">I run hot<span class="block text-sm font-normal text-muted-foreground">Dress about 5° lighter</span></span>
      <button type="button" role="switch" aria-checked="${ctx.runsHot}" aria-labelledby="runs-hot-label" data-action="toggle-runs-hot"
        class="press relative inline-flex h-8 w-14 shrink-0 items-center rounded-full ${ctx.runsHot ? "bg-infield" : "bg-input"}">
        <span class="inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${ctx.runsHot ? "translate-x-7" : "translate-x-1"}"></span>
      </button>
    </div>
    <div class="sticky bottom-0 -mx-1 bg-[var(--raised)] px-1 pt-2 pb-1"><button type="button" data-action="save-paces" class="${primaryBtn} w-full">Save paces</button></div>`;
}

export type ThemeChoice = "system" | "light" | "dark";

export function renderSettingsSheet(ctx: RenderContext, theme: ThemeChoice): string {
  return `${segmented("set-temp-unit", "Temperature", [{ value: "F", label: "°F" }, { value: "C", label: "°C" }], ctx.useCelsius ? "C" : "F")}
    ${segmented("set-dist-unit", "Distance and pace", [{ value: "imperial", label: "Miles" }, { value: "metric", label: "Kilometres" }], ctx.useMetric ? "metric" : "imperial")}
    ${segmented("set-theme", "Appearance", [{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }], theme)}
    <p class="border-t border-hair pt-4 text-sm text-muted-foreground">Settings stay on this device. <a class="font-semibold text-foreground underline" href="/about/">How the numbers work</a></p>`;
}

export function renderLocationSheet(currentName: string, approximate: boolean): string {
  return `<p class="text-[0.95rem] text-muted-foreground">Showing <span class="font-semibold text-foreground">${esc(currentName)}</span>${approximate ? ", based on your network. Set it for exact conditions." : "."}</p>
    <button type="button" data-action="use-precise-location" class="press mt-4 flex min-h-12 w-full items-center gap-3 rounded-[14px] bg-infield px-4 text-left text-base font-bold text-white hover:opacity-95">
      ${crosshairIcon}<span>Use my precise location<span class="block text-sm font-normal text-infield-muted">Your browser will ask once</span></span>
    </button>
    <div class="mt-5">
      <label for="loc-search" class="text-sm font-semibold text-muted-foreground">Or search for a city</label>
      <div class="relative mt-2">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">${searchIcon}</span>
        <input id="loc-search" type="search" enterkeyhint="search" autocomplete="off" placeholder="City or town" class="${field} pl-9" aria-describedby="loc-status" aria-controls="loc-results" />
      </div>
      <p id="loc-status" class="sr-only" aria-live="polite"></p>
      <ul id="loc-results" class="mt-2"></ul>
    </div>`;
}

export function renderLocationResults(labels: string[], query: string): string {
  if (!query) return "";
  if (!labels.length) return `<li class="py-3 text-[0.95rem] text-muted-foreground">No places match “${esc(query)}”. Try a nearby larger town.</li>`;
  return labels.map((l, i) => `<li><button type="button" data-action="select-location" data-loc-index="${i}" class="press flex min-h-12 w-full items-center rounded-[12px] px-3 text-left text-base font-semibold hover:bg-muted">${esc(l)}</button></li>`).join("");
}
