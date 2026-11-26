import { getClothingRec, type ClothingRec } from "../formulas/clothing";
import { windChillF } from "../formulas/wind-chill";
import { getColdPaceAdjustment, getHeatPaceAdjustment } from "../formulas/pace";
import { EFFORTS, EFFORT_HEAT_OFFSET, EFFORT_LABELS, type EffortLevel } from "../state";

/** Temperatures that get their own "what to wear running at X°F" page. */
export const GUIDE_TEMPS: number[] = Array.from({ length: 19 }, (_, i) => i * 5);

export const GUIDE_BASE = "/what-to-wear-running";

export function guidePath(tempF: number): string {
  return `${GUIDE_BASE}/${tempF}-degrees/`;
}

export function toCelsius(tempF: number): number {
  return Math.round(((tempF - 32) * 5) / 9);
}

const CALM = { windMph: 0, precipitating: false, precipProbability: 0, coldAndPrecip: false, uvIndex: 0, visibilityMeters: 10_000 };

export type EffortRow = { effort: EffortLevel; label: string; dressFor: number; rec: ClothingRec };
export type WindRow = { windMph: number; feelsLike: number; easy: ClothingRec; pace: { min: number; max: number; warning?: string } };
export type HeatRow = { dewPointF: number; combined: number; pace: { min: number; max: number; warning?: string } };

export type TemperatureGuide = {
  tempF: number;
  tempC: number;
  efforts: EffortRow[];
  /** Calm-air cold pace adjustment; zero above 40°F. */
  calmPace: { min: number; max: number; warning?: string };
  /** Wind rows only where the NWS wind chill formula applies (≤50°F). */
  wind: WindRow[];
  /** Dew point rows only where heat starts to matter (≥55°F). */
  heat: HeatRow[];
  iceWatch: boolean;
};

function recFor(dressFor: number, windMph = 0): ClothingRec {
  return getClothingRec(dressFor, { ...CALM, windMph });
}

/**
 * The page data for one air temperature, from the same formulas the app uses.
 * Assumes calm, dry air so feels-like equals air temperature; wind rows show the change.
 */
export function buildTemperatureGuide(tempF: number): TemperatureGuide {
  const efforts = EFFORTS.map((effort) => {
    const dressFor = tempF + EFFORT_HEAT_OFFSET[effort];
    return { effort, label: EFFORT_LABELS[effort], dressFor, rec: recFor(dressFor) };
  });

  const wind = tempF <= 50
    ? [10, 20].map((windMph) => {
        const feelsLike = Math.round(windChillF(tempF, windMph));
        return { windMph, feelsLike, easy: recFor(feelsLike + EFFORT_HEAT_OFFSET.easy, windMph), pace: getColdPaceAdjustment(feelsLike) };
      })
    : [];

  const heat = tempF >= 55
    ? [40, 50, 60, 70].filter((d) => d <= tempF).map((dewPointF) => ({ dewPointF, combined: tempF + dewPointF, pace: getHeatPaceAdjustment(tempF, dewPointF) }))
    : [];

  return {
    tempF,
    tempC: toCelsius(tempF),
    efforts,
    calmPace: getColdPaceAdjustment(tempF),
    wind,
    heat,
    iceWatch: tempF <= 35,
  };
}

/** "0–2%" / "8%+" / "none" */
export function paceRangeLabel(p: { min: number; max: number }): string {
  if (p.max === 0) return "none";
  if (!Number.isFinite(p.max)) return `${p.min}%+`;
  return `${p.min}–${p.max}%`;
}

/** Joins kit items into readable prose: "a, b and c". */
export function listPhrase(items: string[]): string {
  // Later items continue the sentence, so only the first keeps its capital.
  const clean = items.filter(Boolean).map((s, i) => (i === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1)));
  if (clean.length <= 1) return clean[0] ?? "";
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

/** One-sentence direct answer for the top of the page and the FAQ. */
export function directAnswer(g: TemperatureGuide): string {
  const easy = g.efforts[0];
  if (!easy) return "";
  const kit = [easy.rec.bottom, easy.rec.top].map((s) => s.toLowerCase());
  const extras = easy.rec.accessories.length ? `, plus ${listPhrase(easy.rec.accessories.map((s) => s.toLowerCase()))}` : "";
  return `For an easy run at ${g.tempF}°F (${g.tempC}°C) in calm, dry air, dress as if it's ${easy.dressFor}°F: ${kit[0]} and ${kit[1]}${extras}.`;
}
