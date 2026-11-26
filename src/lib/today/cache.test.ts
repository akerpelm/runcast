import { describe, expect, it } from "vitest";
import { MAX_SHOW_AGE_MS, readCachedForecast, readLastForecast, sameSpot, writeCachedForecast, type CachedForecast } from "./cache";

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

const NOW = 1_800_000_000_000;
const entry: CachedForecast = {
  lat: 40.69, lng: -73.99, name: "Brooklyn, NY", savedAt: NOW - 60_000,
  weather: { hourly: [], dailyAll: [] } as unknown as CachedForecast["weather"],
  airQuality: null,
};

describe("forecast cache", () => {
  it("matches nearby coordinates only", () => {
    expect(sameSpot({ lat: 40.69, lng: -73.99 }, { lat: 40.694, lng: -73.986 })).toBe(true);
    expect(sameSpot({ lat: 40.69, lng: -73.99 }, { lat: 42.36, lng: -71.06 })).toBe(false);
  });
  it("returns a fresh entry for the same place", () => {
    const s = memoryStorage();
    writeCachedForecast(s, entry);
    expect(readCachedForecast(s, { lat: 40.69, lng: -73.99 }, NOW)?.name).toBe("Brooklyn, NY");
  });
  it("misses for a different place", () => {
    const s = memoryStorage();
    writeCachedForecast(s, entry);
    expect(readCachedForecast(s, { lat: 42.36, lng: -71.06 }, NOW)).toBeNull();
  });
  it("refuses entries too old to show", () => {
    const s = memoryStorage();
    writeCachedForecast(s, { ...entry, savedAt: NOW - MAX_SHOW_AGE_MS - 1 });
    expect(readLastForecast(s, NOW)).toBeNull();
  });
  it("survives corrupt storage", () => {
    const s = memoryStorage();
    s.setItem("runcast-last-forecast", "{not json");
    expect(readLastForecast(s, NOW)).toBeNull();
  });
});
