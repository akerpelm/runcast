/**
 * URL state for the Today screen: ?day=YYYY-MM-DD&hour=H&sheet=id
 * Day and hour are replaced in place; opening a sheet pushes a history entry
 * so the back gesture closes it.
 */
export const SHEET_IDS = ["hours", "kit", "paces", "settings", "location", "log"] as const;
export type SheetId = (typeof SHEET_IDS)[number];

export type TodayUrlState = {
  day: string | null;
  hour: number | null;
  sheet: SheetId | null;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTodayUrl(search: string): TodayUrlState {
  const p = new URLSearchParams(search);
  const day = p.get("day");
  const hourRaw = p.get("hour");
  const hour = hourRaw !== null && /^\d{1,2}$/.test(hourRaw) ? Number(hourRaw) : null;
  const sheet = p.get("sheet");
  return {
    day: day && DAY_RE.test(day) ? day : null,
    hour: hour !== null && hour >= 0 && hour <= 23 ? hour : null,
    sheet: SHEET_IDS.includes(sheet as SheetId) ? (sheet as SheetId) : null,
  };
}

/** Serialise onto the existing query, keeping unrelated params; omits defaults. */
export function serializeTodayUrl(search: string, state: TodayUrlState): string {
  const p = new URLSearchParams(search);
  const set = (k: string, v: string | null) => (v === null ? p.delete(k) : p.set(k, v));
  set("day", state.day);
  set("hour", state.hour === null ? null : String(state.hour));
  set("sheet", state.sheet);
  const q = p.toString();
  return q ? `?${q}` : "";
}
