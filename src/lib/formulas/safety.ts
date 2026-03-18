/**
 * Safety alert system for RunCast.
 * Checks heat risk, lightning, wind, heavy rain, UV, AQI, flooding.
 * Returns alerts sorted by severity (danger first).
 */
import type { HourlyWeather } from "../weather";

export interface SafetyAlert {
  severity: "info" | "caution" | "warning" | "danger";
  type: string;
  title: string;
  message: string;
}

const SEVERITY_ORDER: SafetyAlert["severity"][] = ["danger", "warning", "caution", "info"];

// ─── Heat Risk (NWS Heat Index / Apparent Temperature thresholds) ────────────
function getHeatAlert(
  apparentTempF: number,
  formatTemp: (f: number) => string = (f) => `${Math.round(f)}°F`,
): SafetyAlert | null {
  if (apparentTempF >= 125) {
    return {
      severity: "danger",
      type: "heat",
      title: "Extreme Danger: Heat",
      message: `Heat index above ${formatTemp(125)}. Do not exercise outdoors. Heat stroke imminent with prolonged exposure.`,
    };
  }
  if (apparentTempF >= 104) {
    return {
      severity: "danger",
      type: "heat",
      title: "Danger: Extreme Heat",
      message: `Heat index above ${formatTemp(104)}. Heat stroke likely with prolonged activity. Move indoors or cancel.`,
    };
  }
  if (apparentTempF >= 90) {
    return {
      severity: "warning",
      type: "heat",
      title: "Extreme Caution: Heat",
      message: `Heat index ${formatTemp(90)}–${formatTemp(103)}. Heat exhaustion possible. Shorten run, slow pace significantly, hydrate aggressively.`,
    };
  }
  if (apparentTempF >= 80) {
    return {
      severity: "caution",
      type: "heat",
      title: "Caution: Warm Conditions",
      message: `Heat index ${formatTemp(80)}–${formatTemp(89)}. Fatigue possible with prolonged exposure. Stay hydrated and watch for signs of heat illness.`,
    };
  }
  return null;
}

// ─── Lightning (WMO weather codes 95-99 = thunderstorm) ─────────────────────
function getLightningAlert(weatherCode: number): SafetyAlert | null {
  if (weatherCode >= 95) {
    return {
      severity: "danger",
      type: "lightning",
      title: "Thunderstorm Risk",
      message: "Thunderstorms forecast for this hour. Avoid open areas, exposed ridges, and metal structures. Follow the 30-30 rule.",
    };
  }
  return null;
}

// ─── Wind Safety (NWS thresholds) ───────────────────────────────────────────
function getWindAlert(
  windSpeed: number,
  windGust: number,
  formatSpeed: (mph: number) => string = (mph) => `${Math.round(mph)} mph`,
): SafetyAlert | null {
  if (windGust >= 40) {
    return {
      severity: "danger",
      type: "wind",
      title: "Dangerous Wind",
      message: `Gusts to ${formatSpeed(windGust)}. Risk of falling debris and balance issues. Avoid running near trees and structures.`,
    };
  }
  if (windSpeed >= 31) {
    return {
      severity: "warning",
      type: "wind",
      title: "Wind Advisory Level",
      message: `Sustained ${formatSpeed(windSpeed)} winds. Running will be difficult and potentially unsafe. Consider treadmill.`,
    };
  }
  if (windSpeed >= 25 || windGust >= 30) {
    return {
      severity: "caution",
      type: "wind",
      title: "Strong Wind",
      message: `Wind ${formatSpeed(windSpeed)}, gusts ${formatSpeed(windGust)}. Expect significant resistance. Avoid exposed routes.`,
    };
  }
  return null;
}

// ─── Heavy Rain ─────────────────────────────────────────────────────────────
function getHeavyRainAlert(precipInches: number, weatherCode: number): SafetyAlert | null {
  // >0.3 in/hr is heavy rain (~7.6mm/hr)
  if (precipInches > 0.3 && weatherCode >= 95) {
    return {
      severity: "danger",
      type: "rain",
      title: "Severe Thunderstorm: Heavy Rain",
      message: "Heavy rainfall with thunderstorms. Stay indoors. Flash flooding possible on trails and low-lying paths.",
    };
  }
  if (precipInches > 0.3) {
    return {
      severity: "warning",
      type: "rain",
      title: "Heavy Rain",
      message: "Heavy rainfall expected. Reduced visibility, slippery surfaces. Consider postponing or moving indoors.",
    };
  }
  if (precipInches > 0.1) {
    return {
      severity: "caution",
      type: "rain",
      title: "Rain Expected",
      message: "Moderate rain likely. Wear water-resistant gear. Watch for slick surfaces.",
    };
  }
  return null;
}

// ─── UV (WHO thresholds) ────────────────────────────────────────────────────
function getUVAlert(uvIndex: number): SafetyAlert | null {
  if (uvIndex >= 11) {
    return {
      severity: "danger",
      type: "uv",
      title: "Extreme UV Exposure",
      message: "UV index 11+. Shift your run to early morning or evening. If unavoidable: SPF 50+, hat, sunglasses, cover skin.",
    };
  }
  if (uvIndex >= 8) {
    return {
      severity: "warning",
      type: "uv",
      title: "Very High UV",
      message: "UV index 8–10. Consider running earlier or later. Apply SPF 30+, wear hat and sunglasses.",
    };
  }
  if (uvIndex >= 6) {
    return {
      severity: "caution",
      type: "uv",
      title: "High UV",
      message: "UV index 6–7. Sunscreen, hat, and sunglasses recommended. Seek shade on breaks.",
    };
  }
  return null;
}

// ─── AQI (EPA exercise guidance) ────────────────────────────────────────────
function getAQIAlert(aqi: number | undefined): SafetyAlert | null {
  if (aqi === undefined) return null;
  if (aqi > 200) {
    return {
      severity: "danger",
      type: "aqi",
      title: "Hazardous Air Quality",
      message: `AQI ${aqi}. Do not exercise outdoors. Everyone may experience serious health effects.`,
    };
  }
  if (aqi > 150) {
    return {
      severity: "danger",
      type: "aqi",
      title: "Unhealthy Air Quality",
      message: `AQI ${aqi}. Avoid outdoor exercise. Move workout indoors.`,
    };
  }
  if (aqi > 100) {
    return {
      severity: "warning",
      type: "aqi",
      title: "AQI: Unhealthy for Sensitive Groups",
      message: `AQI ${aqi}. Reduce prolonged outdoor exertion. Sensitive individuals should exercise indoors.`,
    };
  }
  return null;
}

// ─── Flooding / Standing Water ──────────────────────────────────────────────
function getFloodingAlert(recentPrecipInches: number): SafetyAlert | null {
  if (recentPrecipInches > 1.5) {
    return {
      severity: "warning",
      type: "flooding",
      title: "Potential Flooding",
      message: `${recentPrecipInches.toFixed(1)}" of rain in recent hours. Watch for standing water, flooded paths, and debris on trails.`,
    };
  }
  if (recentPrecipInches > 1.0) {
    return {
      severity: "caution",
      type: "flooding",
      title: "Wet Conditions",
      message: `${recentPrecipInches.toFixed(1)}" of recent rain. Expect puddles and wet surfaces. Avoid low-lying trails.`,
    };
  }
  return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────
export function getSafetyAlerts(
  hour: HourlyWeather,
  recentPrecipInches: number,
  aqi?: number,
  formatTemp: (f: number) => string = (f) => `${Math.round(f)}°F`,
  formatSpeed: (mph: number) => string = (mph) => `${Math.round(mph)} mph`,
): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];

  const heat = getHeatAlert(hour.apparentTemperature, formatTemp);
  if (heat) alerts.push(heat);

  const lightning = getLightningAlert(hour.weatherCode);
  if (lightning) alerts.push(lightning);

  const wind = getWindAlert(hour.windSpeed, hour.windGusts, formatSpeed);
  if (wind) alerts.push(wind);

  const rain = getHeavyRainAlert(hour.precipitation, hour.weatherCode);
  if (rain) alerts.push(rain);

  const uv = getUVAlert(hour.uvIndex);
  if (uv) alerts.push(uv);

  const aqiAlert = getAQIAlert(aqi);
  if (aqiAlert) alerts.push(aqiAlert);

  const flood = getFloodingAlert(recentPrecipInches);
  if (flood) alerts.push(flood);

  // Sort by severity (danger first)
  alerts.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  return alerts;
}

// ─── Forecast Scanning ──────────────────────────────────────────────────────
export function findNextPrecip(
  hourly: HourlyWeather[],
  afterTime: Date
): { time: string; prob: number } | null {
  for (const h of hourly) {
    if (new Date(h.time) > afterTime && h.precipProbability >= 40) {
      return { time: h.time, prob: h.precipProbability };
    }
  }
  return null;
}

export function findNextThunderstorm(
  hourly: HourlyWeather[],
  afterTime: Date
): string | null {
  for (const h of hourly) {
    if (new Date(h.time) > afterTime && h.weatherCode >= 95) {
      return h.time;
    }
  }
  return null;
}

export function getRecentPrecipSum(hourly: HourlyWeather[], beforeTime: Date, hoursBack: number): number {
  const cutoff = new Date(beforeTime.getTime() - hoursBack * 3600000);
  return hourly
    .filter(h => {
      const t = new Date(h.time);
      return t >= cutoff && t <= beforeTime;
    })
    .reduce((sum, h) => sum + h.precipitation, 0);
}
