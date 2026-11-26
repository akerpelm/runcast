import { describe, expect, it } from "vitest";
import { parseTodayUrl, serializeTodayUrl } from "./url";

describe("parseTodayUrl", () => {
  it("reads day, hour and sheet", () => {
    expect(parseTodayUrl("?day=2026-11-27&hour=9&sheet=hours")).toEqual({ day: "2026-11-27", hour: 9, sheet: "hours" });
  });
  it("ignores malformed or unknown values", () => {
    expect(parseTodayUrl("?day=friday&hour=25&sheet=admin")).toEqual({ day: null, hour: null, sheet: null });
    expect(parseTodayUrl("?hour=-1")).toEqual({ day: null, hour: null, sheet: null });
    expect(parseTodayUrl("")).toEqual({ day: null, hour: null, sheet: null });
  });
  it("accepts hour 0", () => {
    expect(parseTodayUrl("?hour=0").hour).toBe(0);
  });
});

describe("serializeTodayUrl", () => {
  it("writes state and drops nulls", () => {
    expect(serializeTodayUrl("", { day: "2026-11-27", hour: 9, sheet: null })).toBe("?day=2026-11-27&hour=9");
    expect(serializeTodayUrl("?day=2026-11-27&hour=9", { day: null, hour: null, sheet: null })).toBe("");
  });
  it("keeps unrelated params", () => {
    expect(serializeTodayUrl("?utm_source=hub", { day: null, hour: null, sheet: "kit" })).toBe("?utm_source=hub&sheet=kit");
  });
  it("round-trips", () => {
    const state = { day: "2026-11-28", hour: 0, sheet: "log" as const };
    expect(parseTodayUrl(serializeTodayUrl("", state))).toEqual(state);
  });
});
