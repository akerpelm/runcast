/**
 * Render: Hero card + timeline
 */
import type { HourBriefing, RenderContext } from "../state";
import { esc, getDayLabel, tempDisplay, speedDisplay } from "../display";
import { getConditionIcon, getConditionLabel, chevronLeft, chevronRight } from "../icons";
import { formatTime } from "../formulas/daylight";
import { generateBriefingSummary } from "../compute";
import { htmlBadge } from "./starwind-html";

export function renderHeroForecast(b: HourBriefing, ctx: RenderContext): string {
  const h = b.hour;
  const icon = getConditionIcon(h.weatherCode);
  const condLabel = getConditionLabel(h.weatherCode);

  const td = (f: number) => tempDisplay(f, ctx.useCelsius);
  const sd = (mph: number) => speedDisplay(mph, ctx.useMetric);

  // Run type badge — map to Starwind badge variants
  const typeBadgeMap: Record<string, { variant: "error" | "warning" | "info" | "success"; label: string }> = {
    TREADMILL: { variant: "error", label: "Treadmill Day" },
    TREADMILL_OR_EASY: { variant: "warning", label: "Treadmill / Easy" },
    EASY: { variant: "info", label: "Easy Day" },
    MODERATE: { variant: "warning", label: "Moderate Effort" },
    MODERATE_TO_HARD: { variant: "success", label: "Moderate to Hard" },
    ANY: { variant: "success", label: "Any Workout" },
  };
  const typeBadge = typeBadgeMap[b.runType.type];
  const runTypeBadgeHTML = typeBadge
    ? htmlBadge(typeBadge.label, { variant: typeBadge.variant, size: "sm" })
    : htmlBadge(b.runType.type, { variant: "ghost", size: "sm" });

  // Rain note
  const rainIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline h-3.5 w-3.5 text-info align-text-bottom"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`;
  let forecastNote = "";
  if (b.nextThunderstorm) {
    const ts = formatTime(new Date(b.nextThunderstorm));
    const tsDay = getDayLabel(b.nextThunderstorm.slice(0, 10));
    forecastNote = `<span class="text-xs text-error font-medium">⚡ ${tsDay} ${ts}</span>`;
  }
  if (b.hour.precipitation > 0) {
    forecastNote += `<span class="text-xs text-info">${rainIcon} Raining now</span>`;
  } else if (b.hour.precipProbability >= 40) {
    forecastNote += `<span class="text-xs text-info">${rainIcon} ${b.hour.precipProbability}% rain</span>`;
  } else if (b.nextRain) {
    const rainTime = formatTime(new Date(b.nextRain.time));
    const rainDay = getDayLabel(b.nextRain.time.slice(0, 10));
    const dayLabel = rainDay === "Today" ? "" : `${rainDay} `;
    forecastNote += `<span class="text-xs text-info">${rainIcon} ${dayLabel}${rainTime} (${b.nextRain.prob}%)</span>`;
  } else if (!b.nextThunderstorm) {
    forecastNote = `<span class="text-xs text-success">No rain</span>`;
  }

  // Accent stripe
  const worstSeverity = b.safetyAlerts.length > 0 ? b.safetyAlerts[0].severity : null;
  const stripeColor = worstSeverity === "danger" ? "border-l-error" : worstSeverity === "warning" ? "border-l-warning" : worstSeverity === "caution" ? "border-l-warning/50" : "border-l-primary/40";

  // Day tabs
  const dayTabs = ctx.availableDays.map(d => {
    const active = d.date === ctx.selectedDayDate;
    const label = getDayLabel(d.date);
    return `<button data-action="select-day" data-day="${d.date}"
      class="shrink-0 rounded-[var(--radius-inner)] px-2.5 py-1 text-xs font-semibold transition-colors
        ${active ? "bg-primary/10 text-foreground card-inset" : "text-muted-foreground hover:text-foreground"}"
    >${esc(label)}</button>`;
  }).join("");

  // Timeline pills
  const hours = ctx.displayHours;
  const offset = ctx.timelineOffset;
  const visible = hours.slice(offset, offset + ctx.timelineVisible);
  const currentDayIdx = ctx.availableDays.findIndex(d => d.date === ctx.selectedDayDate);
  const hasPrevDay = currentDayIdx > 0;
  const hasNextDay = currentDayIdx < ctx.availableDays.length - 1;
  const canBack = offset > 0 || hasPrevDay;
  const canFwd = offset + ctx.timelineVisible < hours.length || hasNextDay;

  const nowHour = new Date().getHours();
  const todayStr = new Date().toISOString().slice(0, 10);

  const pills = visible.map((hr, i) => {
    const idx = offset + i;
    const sel = idx === ctx.selectedHourIndex;
    const hrDate = new Date(hr.time);
    const hrNum = hrDate.getHours();
    const isNow = hrNum === nowHour && hr.time.startsWith(todayStr);
    const label = hrNum === 0 ? "12a" : hrNum < 12 ? `${hrNum}a` : hrNum === 12 ? "12p" : `${hrNum - 12}p`;
    const hrIcon = getConditionIcon(hr.weatherCode);

    const pillBg = sel ? "bg-primary/15 card-inset" : isNow ? "bg-secondary/20 border border-secondary/40 rounded-[var(--radius-inner)]" : "hover:bg-muted";
    const labelCls = sel ? "text-foreground font-bold" : isNow ? "text-secondary font-bold" : "text-muted-foreground";
    const tempCls = sel ? "text-foreground" : isNow ? "text-secondary" : "text-foreground";
    const nowDot = "";

    return `<button data-action="select-hour" data-hour-index="${idx}"
      class="flex w-16 shrink-0 flex-col items-center gap-1 rounded-[var(--radius-inner)] p-2 transition-colors cursor-pointer ${pillBg}"
      aria-label="${formatTime(hrDate)}${isNow ? " (now)" : ""}" aria-pressed="${sel}">
      <span class="text-xs font-medium ${labelCls}">${label}</span>
      ${hrIcon}
      <span class="text-sm font-bold ${tempCls} font-data">${td(hr.temperature)}</span>
    </button>`;
  }).join("");

  const navCls = "flex h-8 w-8 items-center justify-center rounded-[var(--radius-inner)] text-muted-foreground transition-colors";

  // Condition chips — use Starwind badge pattern for consistency
  const windMph = Math.round(h.windSpeed);
  const gustMph = Math.round(h.windGusts);
  const chips: { label: string; warn?: boolean }[] = [];

  if (windMph > 5) chips.push({ label: `Wind ${sd(h.windSpeed)}` });
  if (gustMph > windMph + 10) chips.push({ label: `Gusts ${sd(h.windGusts)}`, warn: gustMph >= 25 });
  if (h.precipProbability > 20) chips.push({ label: `${h.precipProbability}% precip`, warn: h.precipProbability >= 60 });
  if (h.humidity > 70) chips.push({ label: `Humid ${Math.round(h.humidity)}%` });
  if (h.dewPoint > 60) chips.push({ label: `Dew ${td(h.dewPoint)}`, warn: h.dewPoint > 65 });
  if (h.uvIndex >= 3) chips.push({ label: `UV ${h.uvIndex}`, warn: h.uvIndex >= 6 });
  if (b.aqiForHour !== undefined && b.aqiForHour > 50) chips.push({ label: `AQI ${b.aqiForHour}`, warn: b.aqiForHour > 100 });
  const visMi = h.visibility / 1609;
  if (visMi < 5) chips.push({ label: `Vis ${ctx.useMetric ? (h.visibility / 1000).toFixed(0) + "km" : visMi.toFixed(0) + "mi"}`, warn: visMi < 2 });

  // Daylight chip
  const sunIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="inline h-3 w-3 align-text-bottom"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
  chips.push({ label: `${sunIcon} ${b.daylight.sunrise} – ${b.daylight.sunset}` });
  if (b.daylight.message) {
    chips.push({ label: b.daylight.message, warn: b.daylight.message.includes("after sunset") || b.daylight.message.includes("before sunrise") });
  }

  const chipsHTML = `<div class="mt-2 flex flex-wrap items-center gap-1.5">
    ${chips.map(c => htmlBadge(c.label, { variant: c.warn ? "warning" : "ghost", size: "sm", class: "font-normal" })).join("")}
  </div>`;

  return `
    <div class="bg-card text-card-foreground card-surface flex flex-col gap-4 py-4 px-4 border-l-[3px] ${stripeColor}" data-slot="card" data-size="sm">
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            ${runTypeBadgeHTML}
            ${forecastNote}
          </div>
          <p class="font-[var(--font-display)] text-base italic text-foreground leading-snug mt-1">${esc(generateBriefingSummary(b))}</p>
        </div>
        <div class="shrink-0 text-right">
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">${icon} <span>${esc(condLabel)}</span></div>
          <p class="text-2xl font-bold text-foreground leading-none mt-1 font-data">${td(h.temperature)}</p>
          <p class="text-[11px] text-muted-foreground mt-0.5">Feels ${td(h.apparentTemperature)}</p>
        </div>
      </div>
      ${chipsHTML}
      <div class="border-t border-border pt-2">
        <div class="mb-2 flex items-center gap-1.5 overflow-x-auto">${dayTabs}</div>
        <div class="flex items-center gap-1">
          <button data-action="timeline-back" aria-label="Earlier hours" class="${navCls} ${canBack ? "hover:text-foreground hover:bg-muted" : "opacity-30 cursor-not-allowed"}" ${canBack ? "" : "disabled"}>${chevronLeft}</button>
          <div class="flex flex-1 gap-1.5 overflow-hidden justify-center">${pills}</div>
          <button data-action="timeline-forward" aria-label="Later hours" class="${navCls} ${canFwd ? "hover:text-foreground hover:bg-muted" : "opacity-30 cursor-not-allowed"}" ${canFwd ? "" : "disabled"}>${chevronRight}</button>
        </div>
      </div>
    </div>`;
}
