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
  const icon = getConditionIcon(h.weatherCode, "h-8 w-8");
  const condLabel = getConditionLabel(h.weatherCode);

  const td = (f: number) => tempDisplay(f, ctx.useCelsius);
  const sd = (mph: number) => speedDisplay(mph, ctx.useMetric);

  // Run type badge
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
    forecastNote = `<span class="text-xs text-error font-medium">\u26A1 ${tsDay} ${ts}</span>`;
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

  // Day tabs — minimal underline active state
  const dayTabs = ctx.availableDays.map(d => {
    const active = d.date === ctx.selectedDayDate;
    const label = getDayLabel(d.date);
    return `<button data-action="select-day" data-day="${d.date}"
      class="shrink-0 px-2 py-1 text-xs font-medium transition-colors
        ${active ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}"
    >${esc(label)}</button>`;
  }).join("");

  // Timeline pills — all hours, horizontally scrollable
  const hours = ctx.displayHours;

  const nowHour = new Date().getHours();
  const todayStr = new Date().toISOString().slice(0, 10);

  const pills = hours.map((hr, idx) => {
    const sel = idx === ctx.selectedHourIndex;
    const hrDate = new Date(hr.time);
    const hrNum = hrDate.getHours();
    const isNow = hrNum === nowHour && hr.time.startsWith(todayStr);
    const label = hrNum === 0 ? "12a" : hrNum < 12 ? `${hrNum}a` : hrNum === 12 ? "12p" : `${hrNum - 12}p`;
    const hrIcon = getConditionIcon(hr.weatherCode);

    const pillBg = sel ? "bg-muted" : "hover:bg-muted/50";
    const labelCls = sel ? "text-foreground font-bold" : isNow ? "text-primary font-bold" : "text-muted-foreground";
    const tempCls = sel ? "text-foreground" : isNow ? "text-primary" : "text-foreground";
    const nowDot = isNow && !sel ? `<span class="absolute top-0.5 right-1 h-1.5 w-1.5 rounded-full bg-primary"></span>` : "";

    return `<button data-action="select-hour" data-hour-index="${idx}"
      class="relative flex w-16 shrink-0 flex-col items-center gap-1 rounded-[var(--radius-inner)] p-2 transition-colors cursor-pointer ${pillBg}"
      aria-label="${formatTime(hrDate)}${isNow ? " (now)" : ""}" aria-pressed="${sel}"
      ${sel ? 'data-selected-pill' : ''}>
      ${nowDot}
      <span class="text-xs font-medium ${labelCls}">${label}</span>
      ${hrIcon}
      <span class="text-sm font-bold ${tempCls} font-data">${td(hr.temperature)}</span>
    </button>`;
  }).join("");

  // Condition chips — ghost style
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
  chips.push({ label: `${sunIcon} ${b.daylight.sunrise} \u2013 ${b.daylight.sunset}` });
  if (b.daylight.message) {
    chips.push({ label: b.daylight.message, warn: b.daylight.message.includes("after sunset") || b.daylight.message.includes("before sunrise") });
  }

  const chipsHTML = `<div class="mt-3 flex flex-wrap items-center gap-1.5">
    ${chips.map(c => htmlBadge(c.label, { variant: c.warn ? "warning" : "ghost", size: "sm", class: "font-normal" })).join("")}
  </div>`;

  return `
    <div class="bg-card text-card-foreground card-surface p-5 lg:p-5" data-slot="card">
      <!-- Top row: badge + forecast note -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          ${runTypeBadgeHTML}
          ${forecastNote}
        </div>
      </div>

      <!-- Two-column: temp + condition | briefing + chips -->
      <div class="mt-3 flex flex-col sm:flex-row sm:items-start sm:gap-8">
        <!-- Left: massive temp + condition -->
        <div class="shrink-0">
          <div class="flex items-start gap-3">
            <p class="font-data font-bold text-foreground leading-none" style="font-size: clamp(3.5rem, 8vw, 6rem)">${td(h.temperature)}</p>
            <div class="mt-2">${icon}</div>
          </div>
          <p class="mt-1 text-sm text-muted-foreground">Feels like ${td(h.apparentTemperature)} · ${esc(condLabel)}</p>
        </div>

        <!-- Right: briefing + chips -->
        <div class="mt-4 sm:mt-1 flex-1 min-w-0">
          <p class="text-sm text-foreground/80 leading-relaxed">${esc(generateBriefingSummary(b))}</p>
          ${chipsHTML}
        </div>
      </div>

      <!-- Day tabs + timeline -->
      <div class="mt-4 lg:mt-3 border-t border-border pt-3 lg:pt-2">
        <div class="mb-2 scroll-fade flex gap-1" id="day-tabs-scroll">${dayTabs}</div>
        <div class="flex items-center gap-1">
          <button data-action="scroll-back" aria-label="Earlier hours" class="hidden lg:flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-inner)] text-muted-foreground transition-colors hover:text-foreground hover:bg-muted">${chevronLeft}</button>
          <div class="scroll-fade flex gap-1 flex-1" id="timeline-scroll">${pills}</div>
          <button data-action="scroll-fwd" aria-label="Later hours" class="hidden lg:flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-inner)] text-muted-foreground transition-colors hover:text-foreground hover:bg-muted">${chevronRight}</button>
        </div>
      </div>
    </div>`;
}
