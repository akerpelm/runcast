import { createContext, useContext } from "react";
import type { EffortLevel, HourBriefing, UserPaces } from "@/lib/state";
import type { BestWindowResult } from "@/lib/formulas/best-window";
import type { DailyWeather, HourlyWeather } from "@/lib/weather";
import type { GeoLocation } from "@/lib/geo";
import type { SheetId } from "@/lib/today/url";
import type { FeedbackContext } from "@/lib/feedback";

export type Prefs = {
  paces: UserPaces;
  effort: EffortLevel;
  runsHot: boolean;
  celsius: boolean;
  metric: boolean;
};

export type ThemeChoice = "system" | "light" | "dark";

/** Everything the Today screen renders, derived once per render from state + forecast. */
export type TodayView = {
  embed: boolean;
  location: GeoLocation;
  approximate: boolean;
  /** Background refresh in flight while older data is on screen. */
  updating: boolean;
  days: DailyWeather[];
  day: string;
  dayLabel: string;
  hours: HourlyWeather[];
  hourIndex: number;
  isBestHour: boolean;
  b: HourBriefing;
  bw: BestWindowResult;
  /** Run band per hour time (0 best .. 4 worst); missing = already passed. */
  bands: Map<string, number>;
  prefs: Prefs;
  sheet: SheetId | null;
  logged: boolean;
  feedbackContext: FeedbackContext;
};

export type TodayActions = {
  selectDay: (day: string) => void;
  selectHour: (index: number) => void;
  selectEffort: (effort: EffortLevel) => void;
  openSheet: (id: SheetId) => void;
  closeSheet: () => void;
  savePaces: (paces: UserPaces) => void;
  setRunsHot: (value: boolean) => void;
  setUnits: (units: { celsius?: boolean; metric?: boolean }) => void;
  setTheme: (choice: ThemeChoice) => void;
  theme: ThemeChoice;
  changeLocation: (loc: GeoLocation) => void;
  usePreciseLocation: () => Promise<void>;
  markLogged: () => void;
  notify: (kind: "success" | "error" | "info", title: string, description?: string) => void;
};

export const TodayContext = createContext<{ view: TodayView; actions: TodayActions } | null>(null);

export function useToday(): { view: TodayView; actions: TodayActions } {
  const ctx = useContext(TodayContext);
  if (!ctx) throw new Error("useToday must be used inside <TodayContext.Provider>");
  return ctx;
}
