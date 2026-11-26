import { useEffect, useRef } from "react";
import { formatTime } from "@/lib/formulas/daylight";
import { getConditionIcon } from "@/lib/icons";
import { speedDisplay, tempDisplay } from "@/lib/display";
import { bandBarPercent, bandWord, isNightHour, windowHours } from "@/lib/today/model";
import { SvgIcon } from "./svg-icon";
import { useToday } from "./today-context";

/** Hours as a bar chart: the bar behind each row shows how the hour ranks. Rows select the hour. */
export function HourTable() {
  const { view, actions } = useToday();
  const { b, bw, prefs, bands } = view;
  const { best, good } = windowHours(bw);
  const selected = useRef<HTMLButtonElement>(null);

  // Open long lists at the selected row rather than midnight.
  useEffect(() => {
    selected.current?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <ul>
      {view.hours.map((hr, idx) => {
        const sel = idx === view.hourIndex;
        const band = bands.get(hr.time);
        return (
          <li key={hr.time} className="border-t border-hair first:border-t-0">
            <button
              ref={sel ? selected : undefined}
              type="button"
              aria-pressed={sel}
              onClick={() => actions.selectHour(idx)}
              className={`press relative my-0.5 flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2.5 text-left ${sel ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              {!sel && band !== undefined && (
                <span className="absolute inset-y-1 left-0 rounded-[10px] bg-window/25" style={{ width: `${bandBarPercent(band)}%` }} aria-hidden="true" />
              )}
              <span className={`relative w-14 shrink-0 text-[0.95rem] font-semibold ${!sel && band === undefined ? "text-muted-foreground" : ""}`}>
                {formatTime(new Date(hr.time)).replace(":00", "")}
                <span className="sr-only">, {bandWord(band)}</span>
              </span>
              <span className="relative shrink-0">
                <SvgIcon svg={getConditionIcon(hr.weatherCode, "h-5 w-5", isNightHour(hr.time, b.daily.sunrise, b.daily.sunset))} />
              </span>
              <span className="relative w-12 shrink-0 text-[0.95rem] font-bold">{tempDisplay(hr.temperature, prefs.celsius)}</span>
              <span className={`relative min-w-0 flex-1 truncate text-sm ${sel ? "" : "text-muted-foreground"}`}>
                {speedDisplay(hr.windSpeed, prefs.metric)} wind{hr.precipProbability >= 20 ? `, ${hr.precipProbability}% rain` : ""}
              </span>
              {best.has(hr.time) && <span className="relative shrink-0 rounded-full bg-infield px-2.5 py-0.5 text-xs font-bold text-white">Best</span>}
              {good.has(hr.time) && <span className="relative shrink-0 rounded-full border border-current px-2.5 py-0.5 text-xs font-bold">Good</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
