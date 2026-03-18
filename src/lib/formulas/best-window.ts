export interface HourlyConditions {
  time: string; // ISO datetime
  temperature: number; // °F
  dewPoint: number; // °F
  windSpeed: number; // mph
  windGust?: number; // mph
  precipProbability: number; // 0-100
  cloudCover: number; // 0-100
  uvIndex: number;
  iceRisk: "NONE" | "LOW" | "MODERATE" | "HIGH";
}

export interface RankedWindow {
  startHour: string;
  endHour: string;
  score: number;
  summary: string;
  label: string;
}

export interface BestWindowResult {
  startHour: string;
  endHour: string;
  score: number;
  summary: string;
  ranked: RankedWindow[];
}

/**
 * Score a single hour of conditions for running suitability.
 * Lower score = better conditions.
 */
export function hourlyRunScore(
  hour: HourlyConditions,
  sunrise: string,
  sunset: string
): number {
  let score = 0;

  // Temperature penalty (ideal range: 45-55°F)
  const { temperature: tempF, dewPoint, windSpeed, windGust, precipProbability, uvIndex, iceRisk } = hour;

  if (tempF < 45) {
    score += (45 - tempF) * 1.5;
  } else if (tempF > 55) {
    score += (tempF - 55) * 2.0;
  }

  // Humidity/dew point penalty (summer-specific)
  if (tempF > 60) {
    const combined = tempF + dewPoint;
    if (combined > 100) {
      score += (combined - 100) * 0.5;
    }
  }

  // Wind penalty
  if (windSpeed > 10) {
    score += (windSpeed - 10) * 1.0;
  }
  if (windGust !== undefined && windGust > 25) {
    score += (windGust - 25) * 0.5;
  }

  // Precipitation penalty
  score += precipProbability * 0.8;

  // UV penalty
  if (uvIndex > 6) {
    score += (uvIndex - 6) * 3;
  }

  // Daylight penalty: penalize if hour is outside sunrise-sunset
  if (hour.time < sunrise || hour.time >= sunset) {
    score += 15;
  }

  // Strong penalty for unsocial hours (11pm-5am) — no one runs at midnight
  const hourOfDay = new Date(hour.time).getHours();
  if (hourOfDay >= 23 || hourOfDay < 5) {
    score += 60;
  }

  // Ice risk penalty
  const iceRiskPenalties: Record<HourlyConditions["iceRisk"], number> = {
    HIGH: 40,
    MODERATE: 20,
    LOW: 5,
    NONE: 0,
  };
  score += iceRiskPenalties[iceRisk];

  return score;
}

/**
 * Find the best running window in a forecast.
 * Returns the start/end hour ISO strings, the best score, and a human-readable summary.
 */
export function findBestWindow(
  hourlyForecast: HourlyConditions[],
  sunrise: string,
  sunset: string,
  runDurationMinutes = 60,
  formatTemp: (f: number) => string = (f) => `${Math.round(f)}°F`,
): BestWindowResult {
  const hoursNeeded = Math.ceil(runDurationMinutes / 60);
  const now = new Date();

  // Filter out past hours (compare Date objects, not strings — avoids UTC vs local mismatch)
  const futureHours = hourlyForecast.filter((h) => new Date(h.time) >= now);

  if (futureHours.length === 0) {
    return {
      startHour: "",
      endHour: "",
      score: Infinity,
      summary: "No forecast data available",
      ranked: [],
    };
  }

  // Score all possible windows
  const scored: { index: number; score: number }[] = [];
  for (let i = 0; i <= futureHours.length - hoursNeeded; i++) {
    const windowHours = futureHours.slice(i, i + hoursNeeded);
    const windowScores = windowHours.map((h) => hourlyRunScore(h, sunrise, sunset));
    const avgScore = windowScores.reduce((sum, s) => sum + s, 0) / windowScores.length;
    scored.push({ index: i, score: avgScore });
  }

  // Handle case where forecast is shorter than hoursNeeded
  if (scored.length === 0 && futureHours.length > 0) {
    const windowScores = futureHours.map((h) => hourlyRunScore(h, sunrise, sunset));
    const avgScore = windowScores.reduce((sum, s) => sum + s, 0) / windowScores.length;
    scored.push({ index: 0, score: avgScore });
  }

  scored.sort((a, b) => a.score - b.score);

  // Pick up to 3 non-overlapping windows
  const picked: typeof scored = [];
  for (const w of scored) {
    if (picked.length >= 3) break;
    // Skip windows overlapping with already-picked ones
    const overlaps = picked.some(p => Math.abs(w.index - p.index) < hoursNeeded);
    if (overlaps) continue;
    // Don't include terrible windows (> 2x best + 40 penalty)
    if (picked.length > 0 && w.score > picked[0].score * 2 + 40) break;
    picked.push(w);
  }

  const labels = ["Best", "Good", "Fair"];
  const ranked: RankedWindow[] = picked.map((w, i) => {
    const start = futureHours[w.index];
    const startDate = new Date(start.time);
    const endDate = new Date(startDate.getTime() + runDurationMinutes * 60 * 1000);
    return {
      startHour: start.time,
      endHour: endDate.toISOString(),
      score: w.score,
      summary: buildSummary(start, sunrise, sunset, formatTemp),
      label: labels[i] || "Fair",
    };
  });

  const primary = ranked[0] || { startHour: "", endHour: "", score: Infinity, summary: "No data", label: "Best" };

  return {
    startHour: primary.startHour,
    endHour: primary.endHour,
    score: primary.score,
    summary: primary.summary,
    ranked,
  };
}

function buildSummary(
  hour: HourlyConditions,
  sunrise: string,
  sunset: string,
  formatTemp: (f: number) => string = (f) => `${Math.round(f)}°F`,
): string {
  const parts: string[] = [];

  // Temperature
  parts.push(formatTemp(hour.temperature));

  // Wind description
  const wind = hour.windSpeed;
  let windDesc: string;
  if (wind < 5) {
    windDesc = "calm";
  } else if (wind < 10) {
    windDesc = "light wind";
  } else if (wind < 20) {
    windDesc = "moderate wind";
  } else {
    windDesc = "strong wind";
  }
  parts.push(windDesc);

  // Daylight status
  const isDaylight = hour.time >= sunrise && hour.time < sunset;
  parts.push(isDaylight ? "daylight" : "after dark");

  return parts.join(", ");
}
