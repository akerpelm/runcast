/**
 * Weather computation functions — computeForHour, computeBestWindow, generateBriefingSummary.
 */
import type { WeatherData, HourlyWeather, DailyWeather } from "./weather";
import type { AirQualityData } from "./air-quality";
import { getAQICategory } from "./air-quality";
import { windChillF } from "./formulas/wind-chill";
import { getHeatPaceAdjustment, getColdPaceAdjustment, formatPace, adjustPace } from "./formulas/pace";
import { getIceRisk } from "./formulas/ice-risk";
import { findBestWindow, type HourlyConditions, type BestWindowResult } from "./formulas/best-window";
import { getClothingRec, getRunnerFeelsLike } from "./formulas/clothing";
import { suggestRunType } from "./formulas/run-type";
import { formatTime } from "./formulas/daylight";
import { getSafetyAlerts, findNextPrecip, findNextThunderstorm, getRecentPrecipSum, type SafetyAlert } from "./formulas/safety";
import type { FeedbackBriefing, FeedbackContext } from "./feedback";
import {
  type HourBriefing, type EffortLevel, type UserPaces,
  EFFORTS, EFFORT_LABELS, EFFORT_HEAT_OFFSET,
} from "./state";
import { paceForDisplay, tempDisplay, speedDisplay } from "./display";

// ─── computeForHour ─────────────────────────────────────────────────────────
export interface ComputeForHourParams {
  hour: HourlyWeather;
  weather: WeatherData;
  airQuality: AirQualityData | null;
  paces: UserPaces;
  selectedEffort: EffortLevel;
  runsHot: boolean;
  selectedDayDate: string;
  availableDays: DailyWeather[];
  useCelsius: boolean;
  useMetric: boolean;
}

export function computeForHour(params: ComputeForHourParams): HourBriefing {
  const { hour, weather, airQuality, paces, selectedEffort, runsHot, selectedDayDate, availableDays, useCelsius, useMetric } = params;
  const daily = availableDays.find(d => d.date === selectedDayDate) || weather.daily;
  const now = new Date();

  // Bound display helpers to current units
  const td = (f: number) => tempDisplay(f, useCelsius);
  const sd = (mph: number) => speedDisplay(mph, useMetric);
  const pfd = (sec: number) => paceForDisplay(sec, useMetric);

  // Wind chill
  const wc = windChillF(hour.temperature, hour.windSpeed);

  // Pace adjustment
  const isHeat = hour.temperature > 55;
  const paceAdj = isHeat
    ? { ...getHeatPaceAdjustment(hour.temperature, hour.dewPoint), type: "heat" as const }
    : { ...getColdPaceAdjustment(wc), type: "cold" as const };

  // Adjusted paces for all set effort levels
  const adjustedPaces: HourBriefing["adjustedPaces"] = [];
  for (const effort of EFFORTS) {
    const base = paces[effort];
    if (base > 0) {
      const minAdj = adjustPace(base, paceAdj.min);
      const maxAdj = paceAdj.max === Infinity ? 0 : adjustPace(base, paceAdj.max);
      adjustedPaces.push({
        effort,
        label: EFFORT_LABELS[effort],
        base: formatPace(pfd(base)),
        adjusted: paceAdj.min === 0 && paceAdj.max === 0
          ? formatPace(pfd(base))
          : maxAdj > 0 ? `${formatPace(pfd(minAdj))}–${formatPace(pfd(maxAdj))}` : `${formatPace(pfd(minAdj))}+`,
      });
    }
  }

  // Ice risk
  const past24h = weather.hourly.filter(h => {
    const t = new Date(h.time);
    return t < now && t > new Date(now.getTime() - 86400000);
  });
  const tempMin24h = past24h.length > 0 ? Math.min(...past24h.map(h => h.temperature)) : hour.temperature;
  const tempMax24h = past24h.length > 0 ? Math.max(...past24h.map(h => h.temperature)) : hour.temperature;
  const precip24h = past24h.reduce((sum, h) => sum + h.precipitation, 0);
  const isEarlyMorning = new Date(hour.time).getHours() < 8;

  const iceRisk = getIceRisk(
    { tempF: hour.temperature, dewPointF: hour.dewPoint, windMph: hour.windSpeed,
      cloudCover: hour.cloudCover, precip: hour.precipitation,
      precipType: hour.snowfall > 0 ? "snow" : hour.rain > 0 ? "rain" : undefined },
    { precip24h, tempMin24h, tempMax24h },
    isEarlyMorning
  );

  // Clothing — offset by effort level and runs-hot preference
  const effortOffset = EFFORT_HEAT_OFFSET[selectedEffort];
  const hotOffset = runsHot ? 5 : 0;
  const feelsLike = getRunnerFeelsLike(hour.apparentTemperature) - 15 + effortOffset + hotOffset;
  const clothing = getClothingRec(feelsLike, {
    windMph: hour.windSpeed,
    precipitating: hour.precipitation > 0,
    precipProbability: hour.precipProbability,
    coldAndPrecip: hour.precipitation > 0 && hour.temperature < 35,
    uvIndex: hour.uvIndex,
    visibilityMeters: hour.visibility,
  });

  // Run type
  const runType = suggestRunType({
    tempF: hour.temperature, dewPointF: hour.dewPoint, windMph: hour.windSpeed,
    windGust: hour.windGusts, precipProb: hour.precipProbability,
    iceRisk: iceRisk.risk, windChillF: wc, visibilityMeters: hour.visibility,
  }, td, sd);

  // Daylight — simple: is the selected time before sunrise or after sunset?
  const hourTime = new Date(hour.time);
  const sunset = new Date(daily.sunset);
  const sunrise = new Date(daily.sunrise);
  const minsAfterSunset = Math.round((hourTime.getTime() - sunset.getTime()) / 60000);
  const minsBeforeSunrise = Math.round((sunrise.getTime() - hourTime.getTime()) / 60000);
  const daylightMessages: string[] = [];
  if (minsBeforeSunrise > 0) {
    daylightMessages.push(`${minsBeforeSunrise} min before sunrise`);
  }
  if (minsAfterSunset > 0) {
    daylightMessages.push(`${minsAfterSunset} min after sunset`);
  } else if (minsAfterSunset > -30) {
    // Within 30 min of sunset — heads up
    daylightMessages.push(`Sunset in ${Math.abs(minsAfterSunset)} min`);
  }
  const isDark = minsBeforeSunrise > 0 || minsAfterSunset > 0;

  // Add reflective gear to clothing when running in the dark
  if (isDark) {
    if (!clothing.accessories.includes("Reflective vest")) clothing.accessories.push("Reflective vest");
    if (!clothing.accessories.includes("Headlamp")) clothing.accessories.push("Headlamp");
  }

  // AQI
  const aqiForHour = airQuality?.hourlyAQI[hour.time];
  const aqiCat = getAQICategory(aqiForHour);

  // Safety alerts
  const recentPrecip = getRecentPrecipSum(weather.hourly, hourTime, 6);
  const safetyAlerts = getSafetyAlerts(hour, recentPrecip, aqiForHour, td, sd);

  // Next rain / thunderstorm (scan all future hours, not just selected day)
  const nextRain = findNextPrecip(weather.hourly, hourTime);
  const nextThunderstorm = findNextThunderstorm(weather.hourly, hourTime);

  // Surface conditions → fold into safety alerts
  if (iceRisk.risk === "HIGH") {
    safetyAlerts.push({ severity: "danger", type: "surface", title: "High Ice Risk", message: iceRisk.reasons.join(". ") });
  } else if (iceRisk.risk === "MODERATE") {
    safetyAlerts.push({ severity: "warning", type: "surface", title: "Moderate Ice Risk", message: iceRisk.reasons.join(". ") });
  } else if (iceRisk.risk === "LOW") {
    safetyAlerts.push({ severity: "caution", type: "surface", title: "Low Ice Risk", message: iceRisk.reasons.join(". ") });
  } else if (recentPrecip > 0.5) {
    safetyAlerts.push({ severity: "info", type: "surface", title: "Wet Surfaces", message: "Recent rain - expect puddles and slick spots." });
  } else if (hour.precipitation > 0) {
    safetyAlerts.push({ severity: "info", type: "surface", title: "Wet Conditions", message: "Active precipitation - surfaces will be slippery." });
  }

  // Re-sort after adding surface alerts
  const SEVERITY_ORDER: SafetyAlert["severity"][] = ["danger", "warning", "caution", "info"];
  safetyAlerts.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  return {
    hour, daily, paceAdjustment: paceAdj, adjustedPaces, windChill: wc,
    iceRisk, clothing, runType,
    daylight: { sunrise: formatTime(sunrise), sunset: formatTime(sunset), message: daylightMessages.length > 0 ? daylightMessages.join(". ") : null },
    aqiForHour, aqiCategory: aqiCat.category,
    safetyAlerts, nextRain, nextThunderstorm,
  };
}

// ─── computeBestWindow ──────────────────────────────────────────────────────
export interface ComputeBestWindowParams {
  weather: WeatherData;
  selectedDayDate: string;
  availableDays: DailyWeather[];
  useCelsius: boolean;
}

export function computeBestWindow(params: ComputeBestWindowParams): BestWindowResult {
  const { weather, selectedDayDate, availableDays, useCelsius } = params;
  const daily = availableDays.find(d => d.date === selectedDayDate) || weather.daily;
  const dayHours = weather.hourly.filter(h => h.time.startsWith(selectedDayDate));
  const now = new Date();

  const past24h = weather.hourly.filter(h => {
    const t = new Date(h.time);
    return t < now && t > new Date(now.getTime() - 86400000);
  });
  const tempMin24h = past24h.length ? Math.min(...past24h.map(h => h.temperature)) : 50;
  const tempMax24h = past24h.length ? Math.max(...past24h.map(h => h.temperature)) : 50;
  const precip24h = past24h.reduce((s, h) => s + h.precipitation, 0);

  const td = (f: number) => tempDisplay(f, useCelsius);

  const conditions: HourlyConditions[] = dayHours.map(h => ({
    time: h.time, temperature: h.temperature, dewPoint: h.dewPoint,
    windSpeed: h.windSpeed, windGust: h.windGusts,
    precipProbability: h.precipProbability, cloudCover: h.cloudCover, uvIndex: h.uvIndex,
    iceRisk: getIceRisk(
      { tempF: h.temperature, dewPointF: h.dewPoint, windMph: h.windSpeed, cloudCover: h.cloudCover, precip: h.precipitation },
      { precip24h, tempMin24h, tempMax24h }, new Date(h.time).getHours() < 8
    ).risk,
  }));

  return findBestWindow(conditions, daily.sunrise, daily.sunset, 60, td);
}

// ─── Briefing Summary Generator ──────────────────────────────────────────────
export function generateBriefingSummary(b: HourBriefing): string {
  const parts: string[] = [];

  // Run type mapping
  const typeMap: Record<string, string> = {
    ANY: "Perfect conditions for any workout.",
    MODERATE_TO_HARD: "Great day to push the pace.",
    MODERATE: "Solid day for a moderate effort.",
    EASY: "Good day for easy miles.",
    TREADMILL_OR_EASY: "Keep it easy or take it inside.",
    TREADMILL: "Treadmill day — conditions are rough.",
  };
  parts.push(typeMap[b.runType.type] || "Check conditions before heading out.");

  // Weather modifier
  const feelsF = b.hour.apparentTemperature;
  if (feelsF < 25) parts.push("Layer up heavy.");
  else if (feelsF < 40) parts.push("Layer up.");
  else if (feelsF > 90) parts.push("Stay light and hydrate.");
  else if (feelsF > 80) parts.push("Stay light.");

  if (b.iceRisk.risk === "HIGH") parts.push("Watch for ice.");
  else if (b.iceRisk.risk === "MODERATE") parts.push("Possible ice patches.");

  if (b.hour.precipitation > 0 || b.hour.precipProbability > 60) parts.push("Bring rain gear.");

  // Pace context
  const pctMin = b.paceAdjustment.min;
  if (pctMin >= 2) {
    parts.push(`Expect to run ~${pctMin}% slower in the ${b.paceAdjustment.type}.`);
  }

  return parts.join(" ");
}

// ─── Feedback bridge helpers ─────────────────────────────────────────────────
export function getBriefingForFeedback(
  displayHours: HourlyWeather[],
  selectedHourIndex: number,
  computeParams: Omit<ComputeForHourParams, "hour">,
): FeedbackBriefing | null {
  const hour = displayHours[selectedHourIndex];
  if (!hour) return null;
  return computeForHour({ ...computeParams, hour });
}

export function getFeedbackContext(
  params: ComputeBestWindowParams,
  locationName: string,
  lat: number | null,
  lng: number | null,
  selectedEffort: EffortLevel,
  runsHot: boolean,
  basePace: number,
): FeedbackContext {
  const bw = computeBestWindow(params);
  const daily = params.availableDays.find(d => d.date === params.selectedDayDate) || params.weather.daily;
  return {
    locationName,
    lat,
    lng,
    selectedEffort,
    runsHot,
    basePace,
    bestWindowStart: bw.startHour,
    bestWindowEnd: bw.endHour,
    sunrise: daily.sunrise,
    sunset: daily.sunset,
  };
}
