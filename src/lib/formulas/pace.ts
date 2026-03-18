/**
 * Get heat-based pace adjustment using the Hadley temp+dew point method.
 */
export function getHeatPaceAdjustment(
  tempF: number,
  dewPointF: number
): { min: number; max: number; warning?: string } {
  const combined = tempF + dewPointF;

  if (combined <= 100) {
    return { min: 0, max: 0 };
  } else if (combined <= 110) {
    return { min: 0, max: 0.5 };
  } else if (combined <= 120) {
    return { min: 0.5, max: 1.0 };
  } else if (combined <= 130) {
    return { min: 1.0, max: 2.0 };
  } else if (combined <= 140) {
    return { min: 2.0, max: 3.0 };
  } else if (combined <= 150) {
    return { min: 3.0, max: 4.5 };
  } else if (combined <= 160) {
    return { min: 4.5, max: 6.0 };
  } else if (combined <= 170) {
    return { min: 6.0, max: 8.0 };
  } else if (combined <= 180) {
    return { min: 8.0, max: 10.0 };
  } else {
    return {
      min: 10.0,
      max: Infinity,
      warning: "Hard running not recommended",
    };
  }
}

/**
 * Get cold-based pace adjustment using wind chill.
 */
export function getColdPaceAdjustment(windChillF: number): {
  min: number;
  max: number;
  warning?: string;
} {
  if (windChillF > 50) {
    return { min: 0, max: 0 };
  } else if (windChillF >= 40) {
    return { min: 0, max: 0 };
  } else if (windChillF >= 30) {
    return { min: 0, max: 2 };
  } else if (windChillF >= 20) {
    return { min: 2, max: 4 };
  } else if (windChillF >= 10) {
    return { min: 4, max: 6 };
  } else if (windChillF >= 0) {
    return { min: 6, max: 8 };
  } else {
    return {
      min: 8,
      max: Infinity,
      warning: "Extreme cold - consider treadmill",
    };
  }
}

/**
 * Calculate wind impact on pace in seconds per mile.
 */
export function windImpactSeconds(windMph: number, isHeadwind: boolean): number {
  const basePenalty = windMph * 1.2;
  return isHeadwind ? basePenalty : -(basePenalty * 0.5);
}

/**
 * Apply a percentage adjustment to a base pace in seconds per mile.
 */
export function adjustPace(basePaceSeconds: number, adjustmentPercent: number): number {
  return basePaceSeconds * (1 + adjustmentPercent / 100);
}

/**
 * Convert seconds to "M:SS" pace format.
 */
export function formatPace(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
