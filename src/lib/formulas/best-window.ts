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

export interface BestWindowResult {
  startHour: string;
  endHour: string;
  score: number;
  summary: string;
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

  // Daylight bonus: penalize if hour is outside sunrise-sunset
  if (hour.time < sunrise || hour.time >= sunset) {
    score += 15;
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
  runDurationMinutes = 60
): BestWindowResult {
  const hoursNeeded = Math.ceil(runDurationMinutes / 60);
  const now = new Date().toISOString();

  // Filter out past hours
  const futureHours = hourlyForecast.filter((h) => h.time >= now);

  if (futureHours.length === 0) {
    // Fallback: no future hours available
    return {
      startHour: "",
      endHour: "",
      score: Infinity,
      summary: "No forecast data available",
    };
  }

  let bestScore = Infinity;
  let bestIndex = 0;

  // Slide a window of hoursNeeded across the future forecast
  for (let i = 0; i <= futureHours.length - hoursNeeded; i++) {
    const windowHours = futureHours.slice(i, i + hoursNeeded);
    const windowScores = windowHours.map((h) => hourlyRunScore(h, sunrise, sunset));
    const avgScore = windowScores.reduce((sum, s) => sum + s, 0) / windowScores.length;

    if (avgScore < bestScore) {
      bestScore = avgScore;
      bestIndex = i;
    }
  }

  // Handle case where forecast is shorter than hoursNeeded
  if (futureHours.length < hoursNeeded) {
    const windowScores = futureHours.map((h) => hourlyRunScore(h, sunrise, sunset));
    bestScore = windowScores.reduce((sum, s) => sum + s, 0) / windowScores.length;
    bestIndex = 0;
  }

  const startHour = futureHours[bestIndex];
  const endIndex = Math.min(bestIndex + hoursNeeded - 1, futureHours.length - 1);
  const endHour = futureHours[endIndex];

  const summary = buildSummary(startHour, sunrise, sunset);

  return {
    startHour: startHour.time,
    endHour: endHour.time,
    score: bestScore,
    summary,
  };
}

function buildSummary(
  hour: HourlyConditions,
  sunrise: string,
  sunset: string
): string {
  const parts: string[] = [];

  // Temperature
  parts.push(`${Math.round(hour.temperature)}°F`);

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
  parts.push(isDaylight ? "full daylight" : "no daylight");

  return parts.join(", ");
}
