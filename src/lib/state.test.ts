import { describe, expect, it } from "vitest";
import { parsePace } from "./state";

describe("parsePace", () => {
  it("reads m:ss and bare digits", () => {
    expect(parsePace("8:30")).toBe(510);
    expect(parsePace("830")).toBe(510);
    expect(parsePace("8:75")).toBe(0);
    expect(parsePace("fast")).toBe(0);
  });
  it("keeps per-mile paces within 4:00–20:00", () => {
    expect(parsePace("4:00")).toBe(240);
    expect(parsePace("3:59")).toBe(0);
    expect(parsePace("20:01")).toBe(0);
  });
  it("accepts fast per-km paces that are valid per mile", () => {
    expect(parsePace("3:45", true)).toBe(225);
    expect(parsePace("2:30", true)).toBe(150);
    expect(parsePace("2:29", true)).toBe(0);
    expect(parsePace("13:00", true)).toBe(0);
  });
});
