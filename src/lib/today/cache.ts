/**
 * Last-known forecast, kept on the device so a return visit paints instantly
 * while fresh data loads in the background.
 */
import type { WeatherData } from "../weather";
import type { AirQualityData } from "../air-quality";

const KEY = "runcast-last-forecast";
/** Older than this, the cached forecast is too stale to show at all. */
export const MAX_SHOW_AGE_MS = 6 * 60 * 60 * 1000;

export type CachedForecast = {
  lat: number;
  lng: number;
  /** Place name shown with the forecast, so the chip matches on instant paint. */
  name: string;
  savedAt: number;
  weather: WeatherData;
  airQuality: AirQualityData | null;
};

/** Same place within ~1 km (two decimals of lat/lng). */
export function sameSpot(a: { lat: number; lng: number }, b: { lat: number; lng: number }): boolean {
  return Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lng - b.lng) < 0.01;
}

export function isShowable(c: Pick<CachedForecast, "savedAt">, now: number): boolean {
  return now - c.savedAt <= MAX_SHOW_AGE_MS;
}

export function readCachedForecast(storage: Pick<Storage, "getItem">, spot: { lat: number; lng: number }, now: number): CachedForecast | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CachedForecast;
    return sameSpot(c, spot) && isShowable(c, now) ? c : null;
  } catch {
    return null;
  }
}

/** The last forecast regardless of place, for first paint before location resolves. */
export function readLastForecast(storage: Pick<Storage, "getItem">, now: number): CachedForecast | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CachedForecast;
    return isShowable(c, now) ? c : null;
  } catch {
    return null;
  }
}

export function writeCachedForecast(storage: Pick<Storage, "setItem">, c: CachedForecast): void {
  try {
    storage.setItem(KEY, JSON.stringify(c));
  } catch {
    // Storage full or unavailable: the cache is an optimisation only.
  }
}
