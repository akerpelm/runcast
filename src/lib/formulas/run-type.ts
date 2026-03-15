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
export function suggestRunType(conditions: RunConditions): RunTypeResult {
  const combined = conditions.tempF + conditions.dewPointF;

  // Hard No's - safety first
  if (combined > 180) {
    return {
      type: "TREADMILL",
      reason: "Dangerously hot and humid — take it indoors",
    };
  }

  if (conditions.iceRisk === "HIGH") {
    return {
      type: "TREADMILL_OR_EASY",
      reason:
        "High ice risk — treadmill or very cautious easy run on treated roads",
    };
  }

  if (conditions.windChillF < 0) {
    return {
      type: "TREADMILL_OR_EASY",
      reason:
        "Extreme cold — treadmill or short easy run with full coverage",
    };
  }

  if (conditions.precipProb > 80 && conditions.tempF < 35) {
    return {
      type: "TREADMILL",
      reason: "Freezing precipitation expected — stay inside",
    };
  }

  // Degraded conditions
  if (combined > 160) {
    return {
      type: "EASY",
      reason: "Very hot — keep it easy, stay hydrated",
    };
  }

  if (conditions.windGust > 30) {
    return {
      type: "EASY",
      reason: "Strong gusts — not a day for speed work",
    };
  }

  if (conditions.windChillF < 15) {
    return {
      type: "EASY",
      reason: "Very cold — keep effort moderate, shorten if needed",
    };
  }

  if (conditions.iceRisk === "MODERATE") {
    return {
      type: "EASY",
      reason: "Watch footing — easy pace on well-traveled routes",
    };
  }

  if (conditions.precipProb > 60) {
    return {
      type: "EASY",
      reason: "Rain likely — easy run, watch for slick surfaces",
    };
  }

  // Suboptimal conditions
  if (
    combined > 140 ||
    conditions.windMph > 15 ||
    conditions.windChillF < 25
  ) {
    return {
      type: "MODERATE",
      reason:
        "Conditions are manageable but not ideal for hard efforts",
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
        "Great conditions — tempo, intervals, long run, whatever's on the schedule",
    };
  }

  // Default fallback
  return {
    type: "MODERATE_TO_HARD",
    reason: "Decent conditions — listen to your body on harder efforts",
  };
}
