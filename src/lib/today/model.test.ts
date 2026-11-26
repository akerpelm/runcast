import { describe, expect, it } from "vitest";
import {
  bandBarPercent, bandsAhead, bandsFor, bandWord, daylightNote, defaultHourIndex, hourLabel,
  isNightHour, paceAdjLabel, paceTitle, shortHour, timeRange, verdictContext, verdictHeadline, windowHours,
} from "./model";
import type { BestWindowResult } from "../formulas/best-window";
import type { HourlyWeather } from "../weather";

const NB = " ";

function bw(...ranges: [string, string][]): BestWindowResult {
  const ranked = ranges.map(([startHour, endHour], i) => ({ startHour, endHour, score: i, summary: "", label: i ? "Good" : "Best" }));
  return { startHour: ranked[0]?.startHour ?? "", endHour: ranked[0]?.endHour ?? "", score: 0, summary: "", ranked };
}

function hours(day: string, count = 24): HourlyWeather[] {
  return Array.from({ length: count }, (_, h) => ({ time: `${day}T${String(h).padStart(2, "0")}:00` }) as HourlyWeather);
}

describe("time formatting", () => {
  it("shares the meridiem when both ends match", () => {
    expect(timeRange("2026-11-27T09:00", "2026-11-27T10:00")).toBe(`9–10${NB}AM`);
  });
  it("spells both meridiems across noon and midnight", () => {
    expect(timeRange("2026-11-27T11:00", "2026-11-27T12:00")).toBe(`11${NB}AM–12${NB}PM`);
    expect(timeRange("2026-11-27T23:00", "2026-11-28T00:00")).toBe(`11${NB}PM–12${NB}AM`);
  });
  it("keeps minutes when present", () => {
    expect(timeRange("2026-11-27T06:30", "2026-11-27T07:30")).toBe(`6:30–7:30${NB}AM`);
  });
  it("formats single hours", () => {
    expect(hourLabel("2026-11-27T00:00")).toBe(`12${NB}AM`);
    expect(shortHour("2026-11-27T00:00")).toBe("12a");
    expect(shortHour("2026-11-27T12:00")).toBe("12p");
    expect(shortHour("2026-11-27T15:00")).toBe("3p");
  });
  it("treats hours outside sunrise to sunset as night", () => {
    expect(isNightHour("2026-11-27T05:00", "2026-11-27T06:56", "2026-11-27T16:30")).toBe(true);
    expect(isNightHour("2026-11-27T12:00", "2026-11-27T06:56", "2026-11-27T16:30")).toBe(false);
    expect(isNightHour("2026-11-27T16:30", "2026-11-27T06:56", "2026-11-27T16:30")).toBe(true);
  });
});

describe("verdict", () => {
  const best = bw(["2026-11-27T09:00", "2026-11-27T10:00"]);
  it("headlines the best window when it's selected", () => {
    expect(verdictHeadline("ANY", "2026-11-27T09:00", best, true)).toBe(`Run 9–10${NB}AM`);
  });
  it("headlines the chosen hour otherwise and points back to the best window", () => {
    expect(verdictHeadline("EASY", "2026-11-27T15:00", best, false)).toBe(`Run at 3${NB}PM`);
    expect(verdictContext(best, false)).toBe(`Your pick. The best window is 9–10${NB}AM.`);
    expect(verdictContext(best, true)).toBeNull();
  });
  it("says treadmill day regardless of hour", () => {
    expect(verdictHeadline("TREADMILL", "2026-11-27T09:00", best, true)).toBe("Treadmill day");
  });
  it("notes darkness and an imminent sunset", () => {
    const sr = "2026-11-27T06:56", ss = "2026-11-27T16:30";
    expect(daylightNote("2026-11-27T20:00", sr, ss, "4:30 PM")).toBe("Dark. Wear lights");
    expect(daylightNote("2026-11-27T16:00", sr, ss, "4:30 PM")).toBe("Sunset 4:30 PM");
    expect(daylightNote("2026-11-27T12:00", sr, ss, "4:30 PM")).toBeNull();
  });
});

describe("pace labels", () => {
  it("describes the adjustment", () => {
    expect(paceAdjLabel({ min: 2, max: 4, type: "cold" }, 5)).toBe("+2–4% for cold");
    expect(paceAdjLabel({ min: 2, max: 4, type: "cold" }, 12)).toBe("+2–4% for cold and wind");
    expect(paceAdjLabel({ min: 0, max: 0, type: "heat" }, 12)).toBe("Wind adjusted");
    expect(paceAdjLabel({ min: 0, max: 0, type: "heat" }, 3)).toBe("No adjustment today");
    expect(paceAdjLabel({ min: 10, max: Infinity, type: "heat", warning: "Hard running not advised" }, 3)).toBe("Hard running not advised");
  });
  it("titles by day without awkward possessives", () => {
    expect(paceTitle("Today")).toBe("Today's pace");
    expect(paceTitle("Tomorrow")).toBe("Tomorrow's pace");
    expect(paceTitle("Fri, 11/27")).toBe("Pace for Fri, 11/27");
  });
});

describe("hour bands", () => {
  it("ranks into five bands, best first", () => {
    const scores = new Map(Array.from({ length: 10 }, (_, i) => [`t${i}`, i * 10] as [string, number]));
    const bands = bandsFor(scores);
    expect(bands.get("t0")).toBe(0);
    expect(bands.get("t9")).toBe(4);
    expect([...bands.values()].every((b) => b >= 0 && b <= 4)).toBe(true);
  });
  it("ranks rather than scales, so one huge outlier doesn't flatten the rest", () => {
    const scores = new Map([["a", 1], ["b", 2], ["c", 3], ["d", 4], ["night", 500]]);
    const bands = bandsFor(scores);
    expect(new Set([bands.get("a"), bands.get("b"), bands.get("c"), bands.get("d")]).size).toBe(4);
  });
  it("gives tied scores the same band", () => {
    const bands = bandsFor(new Map([["a", 5], ["b", 5], ["c", 9]]));
    expect(bands.get("a")).toBe(bands.get("b"));
  });
  it("puts a single hour in the best band", () => {
    expect(bandsFor(new Map([["a", 42]])).get("a")).toBe(0);
  });
  it("only bands hours still ahead", () => {
    const scores = new Map([["2026-11-27T08:00", 1], ["2026-11-27T09:00", 2], ["2026-11-27T10:00", 3]]);
    const bands = bandsAhead(scores, new Date("2026-11-27T09:40"));
    expect(bands.has("2026-11-27T08:00")).toBe(false);
    expect(bands.has("2026-11-27T09:00")).toBe(true);
    expect(bandsAhead(scores, new Date("2026-11-28T00:00")).size).toBe(0);
  });
  it("describes bands in words and as bar lengths", () => {
    expect(bandWord(undefined)).toBe("already passed");
    expect(bandWord(0)).toBe("among the day's best for running");
    expect(bandBarPercent(0)).toBe(100);
    expect(bandBarPercent(4)).toBe(20);
  });
});

describe("windows and default hour", () => {
  it("splits best from good windows", () => {
    const { best, good } = windowHours(bw(["a", "b"], ["c", "d"], ["e", "f"]));
    expect([...best]).toEqual(["a"]);
    expect([...good]).toEqual(["c", "e"]);
  });
  it("defaults to the best window", () => {
    expect(defaultHourIndex(hours("2026-11-27"), "2026-11-27T13:00", false, new Date())).toBe(13);
  });
  it("falls back to now today and 8 AM on other days", () => {
    const h = hours("2026-11-27");
    expect(defaultHourIndex(h, "", true, new Date("2026-11-27T17:20"))).toBe(17);
    expect(defaultHourIndex(h, "", false, new Date("2026-11-26T17:20"))).toBe(8);
  });
  it("falls back to the last hour when nothing is late enough", () => {
    expect(defaultHourIndex(hours("2026-11-27", 6), "", true, new Date("2026-11-27T22:00"))).toBe(5);
  });
});
