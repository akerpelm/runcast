export type RunType =
  | "TREADMILL"
  | "TREADMILL_OR_EASY"
  | "EASY"
  | "MODERATE"
  | "MODERATE_TO_HARD"
  | "ANY";

export interface RunTypeResult {
  type: RunType;
  reason: string;
}

export interface RunConditions {
  tempF: number;
  dewPointF: number;
  windMph: number;
  windGust: number;
  precipProb: number; // 0-100
  iceRisk: "NONE" | "LOW" | "MODERATE" | "HIGH";
  windChillF: number;
}

/**
 * Suggests an appropriate run type based on weather conditions.
 * Uses a decision tree that prioritizes safety and comfort.
 *
 * @param conditions - Weather and environmental conditions
 * @returns Recommended run type with reasoning
 */
export function suggestRunType(
  conditions: RunConditions,
  formatTemp: (f: number) => string = (f) => `${Math.round(f)}°F`,
  formatSpeed: (mph: number) => string = (mph) => `${Math.round(mph)} mph`,
): RunTypeResult {
  const combined = conditions.tempF + conditions.dewPointF;

  // Hard No's - safety first
  if (combined > 180) {
    return {
      type: "TREADMILL",
      reason: `Dangerously hot and humid (${formatTemp(conditions.tempF)}, dew point ${formatTemp(conditions.dewPointF)}) - take it indoors`,
    };
  }

  if (conditions.iceRisk === "HIGH") {
    return {
      type: "TREADMILL_OR_EASY",
      reason:
        "High ice risk - treadmill or very cautious easy run on treated roads",
    };
  }

  if (conditions.windChillF < 0) {
    return {
      type: "TREADMILL_OR_EASY",
      reason: `Extreme cold (wind chill ${formatTemp(conditions.windChillF)}) - treadmill or short easy run with full coverage`,
    };
  }

  if (conditions.precipProb > 80 && conditions.tempF < 35) {
    return {
      type: "TREADMILL",
      reason: `Freezing precipitation expected (${conditions.precipProb}% at ${formatTemp(conditions.tempF)}) - stay inside`,
    };
  }

  // Degraded conditions
  if (combined > 160) {
    return {
      type: "EASY",
      reason: `Very hot and humid (${formatTemp(conditions.tempF)}, dew point ${formatTemp(conditions.dewPointF)}) - keep it easy, stay hydrated`,
    };
  }

  if (conditions.windGust > 30) {
    return {
      type: "EASY",
      reason: `Gusts to ${formatSpeed(conditions.windGust)} - not a day for speed work`,
    };
  }

  if (conditions.windChillF < 15) {
    return {
      type: "EASY",
      reason: `Very cold (wind chill ${formatTemp(conditions.windChillF)}) - keep effort moderate, shorten if needed`,
    };
  }

  if (conditions.iceRisk === "MODERATE") {
    return {
      type: "EASY",
      reason: "Moderate ice risk - easy pace on well-traveled routes, watch footing",
    };
  }

  if (conditions.precipProb > 60) {
    return {
      type: "EASY",
      reason: `Rain likely (${conditions.precipProb}%) - easy run, watch for slick surfaces`,
    };
  }

  // Suboptimal conditions — separate checks for specific reasons
  if (combined > 140) {
    return {
      type: "MODERATE",
      reason: `Warm and humid (${formatTemp(conditions.tempF)}, dew point ${formatTemp(conditions.dewPointF)}) - not ideal for hard efforts`,
    };
  }

  if (conditions.windMph > 15) {
    return {
      type: "MODERATE",
      reason: `Windy (${formatSpeed(conditions.windMph)} sustained) - manageable but expect resistance on exposed routes`,
    };
  }

  if (conditions.windChillF < 25) {
    return {
      type: "MODERATE",
      reason: `Cold (wind chill ${formatTemp(conditions.windChillF)}) - manageable but keep hard efforts short`,
    };
  }

  // Good conditions
  if (
    combined <= 130 &&
    conditions.windMph <= 12 &&
    conditions.precipProb < 30 &&
    conditions.tempF >= 35 &&
    conditions.tempF <= 65
  ) {
    return {
      type: "ANY",
      reason:
        "Great conditions - tempo, intervals, long run, whatever's on the schedule",
    };
  }

  // Default fallback
  return {
    type: "MODERATE_TO_HARD",
    reason: "Decent conditions - listen to your body on harder efforts",
  };
}
