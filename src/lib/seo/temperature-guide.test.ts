import { describe, expect, it } from "vitest";
import { GUIDE_TEMPS, buildTemperatureGuide, directAnswer, guidePath, listPhrase, paceRangeLabel, toCelsius } from "./temperature-guide";

describe("temperature guide", () => {
  it("covers 0–90°F in 5° steps", () => {
    expect(GUIDE_TEMPS[0]).toBe(0);
    expect(GUIDE_TEMPS.at(-1)).toBe(90);
    expect(guidePath(30)).toBe("/what-to-wear-running/30-degrees/");
  });
  it("converts to Celsius", () => {
    expect(toCelsius(32)).toBe(0);
    expect(toCelsius(50)).toBe(10);
  });
  it("dresses each effort warmer by its offset", () => {
    const g = buildTemperatureGuide(30);
    expect(g.efforts.map((e) => e.dressFor)).toEqual([45, 47, 50, 52, 55]);
    expect(g.efforts[0]?.rec.top).toBe("Long-sleeve tech tee");
  });
  it("adds wind rows only where wind chill applies", () => {
    expect(buildTemperatureGuide(30).wind.map((w) => w.windMph)).toEqual([10, 20]);
    expect(buildTemperatureGuide(30).wind[1]?.feelsLike).toBe(17);
    expect(buildTemperatureGuide(60).wind).toEqual([]);
  });
  it("adds heat rows from 55°F with dew points at or below the temperature", () => {
    expect(buildTemperatureGuide(50).heat).toEqual([]);
    const hot = buildTemperatureGuide(85);
    expect(hot.heat.map((h) => h.combined)).toEqual([125, 135, 145, 155]);
    expect(hot.heat.map((h) => paceRangeLabel(h.pace))).toEqual(["1–2%", "2–3%", "3–4.5%", "4.5–6%"]);
  });
  it("labels pace ranges and lists kit", () => {
    expect(paceRangeLabel({ min: 0, max: 0 })).toBe("none");
    expect(paceRangeLabel({ min: 8, max: Infinity })).toBe("8%+");
    expect(listPhrase(["Gloves", "Headband", "Beanie"])).toBe("Gloves, headband and beanie");
  });
  it("answers directly", () => {
    expect(directAnswer(buildTemperatureGuide(40))).toMatch(/^For an easy run at 40°F \(4°C\) in calm, dry air, dress as if it's 55°F: /);
  });
});
