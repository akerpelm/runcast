export type IceRiskLevel = "NONE" | "LOW" | "MODERATE" | "HIGH";

export interface IceRiskInput {
  tempF: number;
  dewPointF: number;
  windMph: number;
  cloudCover: number; // 0-100
  precip: number; // current precipitation in inches
  precipType?: "rain" | "snow" | "sleet" | "freezing_rain";
}

export interface IceRiskHistory {
  precip24h: number; // precipitation in last 24h (inches)
  tempMin24h: number;
  tempMax24h: number;
}

export interface IceRiskResult {
  risk: IceRiskLevel;
  reasons: string[];
}

const RISK_ORDER: IceRiskLevel[] = ["NONE", "LOW", "MODERATE", "HIGH"];

export function upgradeRisk(
  current: IceRiskLevel,
  proposed: IceRiskLevel
): IceRiskLevel {
  return RISK_ORDER.indexOf(proposed) > RISK_ORDER.indexOf(current)
    ? proposed
    : current;
}

export function getIceRisk(
  current: IceRiskInput,
  history: IceRiskHistory,
  isEarlyMorning: boolean
): IceRiskResult {
  let risk: IceRiskLevel = "NONE";
  const reasons: string[] = [];

  // SCENARIO 1: Active freezing precipitation
  if (current.precip > 0 && current.tempF <= 34) {
    if (
      current.precipType === "freezing_rain" ||
      current.precipType === "sleet"
    ) {
      risk = upgradeRisk(risk, "HIGH");
      reasons.push(
        "Active freezing precipitation - extremely slippery surfaces"
      );
    } else if (current.precipType === "snow") {
      risk = upgradeRisk(risk, "MODERATE");
      reasons.push(
        "Active snowfall - reduced traction, watch for hidden ice beneath"
      );
    }
  }

  // SCENARIO 2: Black ice (recent rain/melt + freeze)
  if (history.tempMax24h > 34 && current.tempF <= 32) {
    if (history.precip24h > 0) {
      risk = upgradeRisk(risk, "HIGH");
      reasons.push(
        "Recent precipitation when warmer + current freezing = high black ice risk, especially bridges and shaded areas"
      );
    } else if (history.tempMax24h > 40) {
      risk = upgradeRisk(risk, "MODERATE");
      reasons.push(
        "Freeze/thaw cycle - melted snow or puddles likely refreezing"
      );
    }
  }

  // SCENARIO 3: Frost formation
  if (
    current.tempF <= 38 &&
    current.tempF >= 28 &&
    current.cloudCover < 40 &&
    current.windMph < 10 &&
    current.tempF - current.dewPointF < 5
  ) {
    risk = upgradeRisk(risk, "LOW");
    reasons.push(
      "Frost likely on surfaces - sidewalks and bridges may be slippery"
    );
  }

  // SCENARIO 4: Fog + freezing
  if (
    current.tempF <= 33 &&
    Math.abs(current.tempF - current.dewPointF) <= 2 &&
    current.windMph < 8
  ) {
    risk = upgradeRisk(risk, "HIGH");
    reasons.push(
      "Freezing fog conditions - rapid ice formation possible on all surfaces"
    );
  }

  // SCENARIO 5: Bridge/overpass warning (add reason but don't upgrade risk)
  if (current.tempF <= 36 && current.tempF >= 30) {
    reasons.push(
      "Bridges and overpasses may be icy even if roads are clear"
    );
  }

  // SCENARIO 6: Morning ice after clear cold night
  if (isEarlyMorning && current.tempF <= 40 && current.cloudCover < 30) {
    risk = upgradeRisk(risk, "LOW");
    reasons.push(
      "Early morning after clear night - ground surfaces may be colder than air temp, watch for ice patches"
    );
  }

  return { risk, reasons };
}
