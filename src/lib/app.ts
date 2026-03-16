/**
 * Main app orchestrator — runs client-side on page load.
 * Fetches weather data, runs formulas, renders the briefing UI.
 */
import { getUserLocation } from "./geo";
import { fetchWeather, type WeatherData, type HourlyWeather } from "./weather";
import { fetchAirQuality, type AirQualityData } from "./air-quality";
import { windChillF } from "./formulas/wind-chill";
import { getHeatPaceAdjustment, getColdPaceAdjustment, formatPace, adjustPace } from "./formulas/pace";
import { getIceRisk, type IceRiskResult } from "./formulas/ice-risk";
import { findBestWindow, type HourlyConditions, type BestWindowResult } from "./formulas/best-window";
import { getClothingRec, getRunnerFeelsLike, type ClothingRec } from "./formulas/clothing";
import { suggestRunType, type RunTypeResult } from "./formulas/run-type";
import { checkDaylightAtEnd, formatTime } from "./formulas/daylight";

interface RunCastBriefing {
  location: string;
  weather: WeatherData;
  airQuality: AirQualityData | null;
  paceAdjustment: { min: number; max: number; warning?: string; type: "heat" | "cold" };
  windChill: number;
  iceRisk: IceRiskResult;
  bestWindow: BestWindowResult;
  clothing: ClothingRec;
  runType: RunTypeResult;
  daylight: { sunrise: string; sunset: string; message: string | null };
  currentHour: HourlyWeather;
}

export async function initApp(): Promise<void> {
  try {
    const location = await getUserLocation();
    updateLocationDisplay(location.name);

    const [weather, airQuality] = await Promise.all([
      fetchWeather(location.latitude, location.longitude),
      fetchAirQuality(location.latitude, location.longitude).catch(() => null),
    ]);

    const briefing = computeBriefing(location.name, weather, airQuality);
    renderBriefing(briefing);
  } catch (err) {
    renderError(err instanceof Error ? err.message : "Something went wrong");
  }
}

function updateLocationDisplay(name: string): void {
  const el = document.getElementById("location-text");
  if (el) el.textContent = name;
}

function getCurrentHour(hourly: HourlyWeather[]): HourlyWeather {
  const now = new Date();
  const currentHourISO = now.toISOString().slice(0, 13);
  return hourly.find(h => h.time.startsWith(currentHourISO)) ?? hourly[hourly.length - 1];
}

function computeBriefing(
  locationName: string,
  weather: WeatherData,
  airQuality: AirQualityData | null
): RunCastBriefing {
  const current = weather.current;
  const currentHour = getCurrentHour(weather.hourly);
  const daily = weather.daily;

  // Wind chill
  const wc = windChillF(currentHour.temperature, currentHour.windSpeed);

  // Pace adjustment — pick heat or cold based on temperature
  const combined = currentHour.temperature + currentHour.dewPoint;
  const isHeatRelevant = currentHour.temperature > 55;
  const paceAdj = isHeatRelevant
    ? { ...getHeatPaceAdjustment(currentHour.temperature, currentHour.dewPoint), type: "heat" as const }
    : { ...getColdPaceAdjustment(wc), type: "cold" as const };

  // Ice risk — need 24h history from hourly data
  const now = new Date();
  const past24h = weather.hourly.filter(h => {
    const t = new Date(h.time);
    return t < now && t > new Date(now.getTime() - 24 * 60 * 60 * 1000);
  });
  const tempMin24h = past24h.length > 0 ? Math.min(...past24h.map(h => h.temperature)) : currentHour.temperature;
  const tempMax24h = past24h.length > 0 ? Math.max(...past24h.map(h => h.temperature)) : currentHour.temperature;
  const precip24h = past24h.reduce((sum, h) => sum + h.precipitation, 0);
  const isEarlyMorning = now.getHours() < 8;

  const iceRisk = getIceRisk(
    {
      tempF: currentHour.temperature,
      dewPointF: currentHour.dewPoint,
      windMph: currentHour.windSpeed,
      cloudCover: currentHour.cloudCover,
      precip: current.precipitation,
      precipType: currentHour.snowfall > 0 ? "snow" : currentHour.rain > 0 ? "rain" : undefined,
    },
    { precip24h, tempMin24h, tempMax24h },
    isEarlyMorning
  );

  // Best window — map hourly data to HourlyConditions
  const todayHours = weather.hourly.filter(h => h.time.startsWith(now.toISOString().slice(0, 10)));
  const hourlyConditions: HourlyConditions[] = todayHours.map(h => ({
    time: h.time,
    temperature: h.temperature,
    dewPoint: h.dewPoint,
    windSpeed: h.windSpeed,
    windGust: h.windGusts,
    precipProbability: h.precipProbability,
    cloudCover: h.cloudCover,
    uvIndex: h.uvIndex,
    iceRisk: getIceRisk(
      { tempF: h.temperature, dewPointF: h.dewPoint, windMph: h.windSpeed, cloudCover: h.cloudCover, precip: h.precipitation },
      { precip24h, tempMin24h, tempMax24h },
      new Date(h.time).getHours() < 8
    ).risk,
  }));
  const bestWindow = findBestWindow(hourlyConditions, daily.sunrise, daily.sunset);

  // Clothing
  const feelsLike = getRunnerFeelsLike(currentHour.apparentTemperature);
  const clothing = getClothingRec(feelsLike, {
    windMph: currentHour.windSpeed,
    precipitating: current.precipitation > 0,
    coldAndPrecip: current.precipitation > 0 && currentHour.temperature < 35,
    highUV: currentHour.uvIndex > 6,
  });

  // Run type
  const runType = suggestRunType({
    tempF: currentHour.temperature,
    dewPointF: currentHour.dewPoint,
    windMph: currentHour.windSpeed,
    windGust: currentHour.windGusts,
    precipProb: currentHour.precipProbability,
    iceRisk: iceRisk.risk,
    windChillF: wc,
  });

  // Daylight
  const sunset = new Date(daily.sunset);
  const sunrise = new Date(daily.sunrise);
  const daylightCheck = checkDaylightAtEnd(now, 60, sunset);

  return {
    location: locationName,
    weather,
    airQuality,
    paceAdjustment: paceAdj,
    windChill: wc,
    iceRisk,
    bestWindow,
    clothing,
    runType,
    daylight: {
      sunrise: formatTime(sunrise),
      sunset: formatTime(sunset),
      message: daylightCheck.message,
    },
    currentHour,
  };
}

// ============================================================
// RENDERING
// ============================================================

function renderBriefing(b: RunCastBriefing): void {
  const skeleton = document.getElementById("briefing-skeleton");
  const live = document.getElementById("briefing-live");
  if (!skeleton || !live) return;

  live.innerHTML = buildBriefingHTML(b);
  skeleton.classList.add("hidden");
  live.classList.remove("hidden");
}

function renderError(message: string): void {
  const skeleton = document.getElementById("briefing-skeleton");
  const live = document.getElementById("briefing-live");
  if (!skeleton || !live) return;

  live.innerHTML = `
    <div class="rounded-[var(--radius-container)] bg-background p-6 neu-extruded">
      <div class="flex items-center gap-3 text-error">
        <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
        </svg>
        <p class="text-sm font-medium">${escapeHTML(message)}</p>
      </div>
    </div>
  `;
  skeleton.classList.add("hidden");
  live.classList.remove("hidden");
}

function buildBriefingHTML(b: RunCastBriefing): string {
  const h = b.currentHour;
  const temp = Math.round(h.temperature);
  const wind = Math.round(h.windSpeed);
  const humidity = Math.round(h.humidity);

  // Run type badge color
  const typeColors: Record<string, string> = {
    TREADMILL: "bg-error/15 text-error",
    TREADMILL_OR_EASY: "bg-warning/15 text-warning-foreground",
    EASY: "bg-info/15 text-info-foreground",
    MODERATE: "bg-warning/15 text-warning-foreground",
    MODERATE_TO_HARD: "bg-success/15 text-success-foreground",
    ANY: "bg-success/15 text-success-foreground",
  };
  const typeLabels: Record<string, string> = {
    TREADMILL: "Treadmill Day",
    TREADMILL_OR_EASY: "Treadmill / Easy",
    EASY: "Easy Day",
    MODERATE: "Moderate Effort",
    MODERATE_TO_HARD: "Moderate to Hard",
    ANY: "Any Workout",
  };

  // Pace display
  let paceStr = "";
  if (b.paceAdjustment.warning) {
    paceStr = b.paceAdjustment.warning;
  } else if (b.paceAdjustment.min === 0 && b.paceAdjustment.max === 0) {
    paceStr = "No adjustment needed";
  } else {
    paceStr = `${b.paceAdjustment.min}–${b.paceAdjustment.max}% slower`;
  }

  // AQI badge
  let aqiBadge = "";
  if (b.airQuality) {
    const aqiColors: Record<string, string> = {
      "Good": "bg-success/15 text-success-foreground",
      "Moderate": "bg-warning/15 text-warning-foreground",
      "Unhealthy for Sensitive Groups": "bg-warning/15 text-warning-foreground",
      "Unhealthy": "bg-error/15 text-error",
      "Very Unhealthy": "bg-error/15 text-error",
      "Hazardous": "bg-error/15 text-error",
    };
    aqiBadge = `
      <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${aqiColors[b.airQuality.category] || ""}">
        AQI ${b.airQuality.currentAQI} · ${b.airQuality.category}
      </span>
    `;
  }

  // Ice warning
  let iceWarningHTML = "";
  if (b.iceRisk.risk !== "NONE") {
    const iceColors: Record<string, string> = {
      LOW: "border-l-warning",
      MODERATE: "border-l-warning",
      HIGH: "border-l-error",
    };
    iceWarningHTML = `
      <div class="rounded-[var(--radius-container)] border-l-4 ${iceColors[b.iceRisk.risk]} bg-background p-5 neu-extruded">
        <div class="flex items-start gap-3">
          <svg class="mt-0.5 h-5 w-5 shrink-0 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
          <div>
            <p class="text-sm font-semibold text-foreground">Surface Warning · ${b.iceRisk.risk} Risk</p>
            ${b.iceRisk.reasons.map(r => `<p class="mt-1 text-xs text-muted-foreground">${escapeHTML(r)}</p>`).join("")}
          </div>
        </div>
      </div>
    `;
  }

  // Best window time formatting
  const bwStart = b.bestWindow.startHour ? formatTime(new Date(b.bestWindow.startHour)) : "—";
  const bwEnd = b.bestWindow.endHour ? formatTime(new Date(b.bestWindow.endHour)) : "—";

  // Hour timeline (next 12 hours)
  const now = new Date();
  const futureHours = b.weather.hourly
    .filter(h => new Date(h.time) >= now)
    .slice(0, 12);

  const timelineHTML = futureHours.map(h => {
    const hourDate = new Date(h.time);
    const hourLabel = hourDate.getHours() === 0 ? "12a" :
      hourDate.getHours() < 12 ? `${hourDate.getHours()}a` :
      hourDate.getHours() === 12 ? "12p" :
      `${hourDate.getHours() - 12}p`;
    const hTemp = Math.round(h.temperature);
    const isCurrentHour = h.time === b.currentHour.time;

    return `
      <div class="flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-[var(--radius-base)] bg-background p-2.5 ${isCurrentHour ? "neu-inset-deep ring-2 ring-primary/30" : "neu-inset-sm"}">
        <span class="text-[11px] font-medium text-muted-foreground">${hourLabel}</span>
        <span class="text-sm font-bold text-foreground">${hTemp}°</span>
        <span class="text-[10px] text-muted-foreground">${Math.round(h.windSpeed)}mph</span>
        ${h.precipProbability > 20 ? `<span class="text-[10px] text-info">${Math.round(h.precipProbability)}%</span>` : ""}
      </div>
    `;
  }).join("");

  // Clothing items
  const clothingItems = [
    { label: "Bottom", value: b.clothing.bottom, icon: "M6.5 2H18l-.5 9h-6l-.5 5H7l-.5-14Z" },
    { label: "Top", value: b.clothing.top, icon: "M14 22v-4a2 2 0 0 0-4 0v4M3 14l5-5 4 4 4-4 5 5" },
    ...b.clothing.accessories.map(a => ({
      label: "Accessory", value: a,
      icon: "M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Z"
    })),
  ];

  return `
    <!-- Hero: Run Type + Conditions -->
    <div class="rounded-[var(--radius-container)] bg-background p-6 neu-extruded">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${typeColors[b.runType.type] || ""}">
          ${typeLabels[b.runType.type] || b.runType.type}
        </span>
        ${aqiBadge}
      </div>
      <p class="mb-5 text-sm text-muted-foreground">${escapeHTML(b.runType.reason)}</p>

      <div class="grid gap-4 sm:grid-cols-3">
        <!-- Temperature -->
        <div class="rounded-[var(--radius-base)] bg-background p-4 neu-inset">
          <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Temperature</p>
          <p class="mt-1 text-2xl font-bold text-foreground">${temp}°F</p>
          <p class="text-xs text-muted-foreground">Feels ${Math.round(h.apparentTemperature)}°</p>
        </div>
        <!-- Wind -->
        <div class="rounded-[var(--radius-base)] bg-background p-4 neu-inset">
          <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wind</p>
          <p class="mt-1 text-2xl font-bold text-foreground">${wind} mph</p>
          <p class="text-xs text-muted-foreground">Gusts ${Math.round(h.windGusts)} mph</p>
        </div>
        <!-- Pace -->
        <div class="rounded-[var(--radius-base)] bg-background p-4 neu-inset">
          <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pace Adj.</p>
          <p class="mt-1 text-2xl font-bold text-foreground">${b.paceAdjustment.min === 0 && b.paceAdjustment.max === 0 ? "0%" : `${b.paceAdjustment.min}–${b.paceAdjustment.max}%`}</p>
          <p class="text-xs text-muted-foreground">${b.paceAdjustment.type === "heat" ? "Heat" : "Cold"} adjustment</p>
        </div>
      </div>
    </div>

    <!-- Hour Timeline -->
    <div class="mt-6 rounded-[var(--radius-container)] bg-background p-4 neu-extruded">
      <p class="mb-3 text-sm font-semibold text-foreground">Hourly Forecast</p>
      <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        ${timelineHTML}
      </div>
    </div>

    <!-- Best Window + Daylight -->
    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      <div class="rounded-[var(--radius-container)] border-l-4 border-l-primary bg-background p-5 neu-extruded">
        <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Best Window</p>
        <p class="mt-1 text-lg font-bold text-foreground">${bwStart} – ${bwEnd}</p>
        <p class="mt-1 text-xs text-muted-foreground">${escapeHTML(b.bestWindow.summary)}</p>
      </div>
      <div class="rounded-[var(--radius-container)] bg-background p-5 neu-extruded">
        <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Daylight</p>
        <p class="mt-1 text-sm font-semibold text-foreground">
          <span class="text-warning">☀</span> ${b.daylight.sunrise} — ${b.daylight.sunset}
        </p>
        ${b.daylight.message ? `<p class="mt-1 text-xs text-muted-foreground">${escapeHTML(b.daylight.message)}</p>` : ""}
      </div>
    </div>

    <!-- Ice Warning (conditional) -->
    ${iceWarningHTML ? `<div class="mt-6">${iceWarningHTML}</div>` : ""}

    <!-- Clothing Recommendations -->
    <div class="mt-6 rounded-[var(--radius-container)] bg-background p-5 neu-extruded">
      <p class="mb-4 text-sm font-semibold text-foreground">What to Wear</p>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        ${clothingItems.map(item => `
          <div class="rounded-[var(--radius-base)] bg-background p-3 neu-inset-sm">
            <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">${escapeHTML(item.label)}</p>
            <p class="mt-1 text-sm font-medium text-foreground">${escapeHTML(item.value)}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function escapeHTML(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
