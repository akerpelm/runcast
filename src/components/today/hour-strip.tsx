import { useEffect, useRef } from "react";
import { getConditionIcon, getConditionLabel } from "@/lib/icons";
import { tempDisplay } from "@/lib/display";
import { bandWord, isCurrentHour, isNightHour, shortHour, windowHours } from "@/lib/today/model";
import { RankBar } from "./rank-bar";
import { SvgIcon } from "./svg-icon";
import { WindowLegend } from "./window-legend";
import { centerInRow } from "./center-in-row";
import { useToday } from "./today-context";

/** Phone: the day as a scrollable strip of shaded hour cells. */
export function HourStrip() {
  const { view, actions } = useToday();
  const { b, bw, prefs, bands } = view;
  const { best, good } = windowHours(bw);
  const selected = useRef<HTMLButtonElement>(null);
  const now = new Date();

  useEffect(() => {
    centerInRow(selected.current);
  }, [view.day, view.hourIndex]);

  return (
    <section aria-labelledby="hours-title" className="mt-6 lg:hidden">
      <div className="flex items-center justify-between">
        <h2 id="hours-title" className="font-(family-name:--font-display) text-lg font-bold uppercase tracking-[0.04em]">Hour by hour</h2>
        <button type="button" onClick={() => actions.openSheet("hours")} className="press min-h-11 rounded-full px-3 text-sm font-semibold text-primary hover:bg-muted">
          Details
        </button>
      </div>
      <ul data-scroll-row className="no-scrollbar fade-edge -mx-4 mt-2 flex gap-2.5 overflow-x-auto scroll-px-4 px-4 pt-3 pb-2" style={{ scrollSnapType: "x proximity" }}>
        {view.hours.map((hr, idx) => {
          const sel = idx === view.hourIndex;
          const band = bands.get(hr.time);
          const isBest = best.has(hr.time);
          const isGood = good.has(hr.time);
          const rain = hr.precipProbability >= 30;
          // Window marks sit outside the cell, on the page ground, so they read on any band.
          const ring = isBest ? "ring-[3px] ring-window ring-offset-2 ring-offset-background" : isGood ? "outline-2 outline-dashed outline-window outline-offset-2" : "";
          const fill = sel ? "bg-foreground text-background" : band === undefined ? "run-band-past" : `run-band-${band}`;
          return (
            <li key={hr.time}>
              <button
                ref={sel ? selected : undefined}
                type="button"
                aria-pressed={sel}
                onClick={() => actions.selectHour(idx)}
                className={`press relative flex h-[6.25rem] w-[3.75rem] flex-col items-center justify-center gap-1 rounded-[14px] pb-2 ring-1 ring-hair ${fill} ${ring}`}
              >
                <span className={`text-xs font-semibold ${sel ? "" : "opacity-85"}`}>{isCurrentHour(hr.time, now) ? "Now" : shortHour(hr.time)}</span>
                <SvgIcon svg={getConditionIcon(hr.weatherCode, "h-5 w-5", isNightHour(hr.time, b.daily.sunrise, b.daily.sunset))} />
                <span className="text-[0.95rem] leading-none font-bold">
                  {tempDisplay(hr.temperature, prefs.celsius)}
                  <span className="sr-only">
                    {`, ${bandWord(band)}, ${getConditionLabel(hr.weatherCode)}${rain ? `, ${hr.precipProbability}% rain` : ""}${isBest ? ", best window" : isGood ? ", also good" : ""}`}
                  </span>
                </span>
                <span className="h-3 text-[0.7rem] leading-none font-semibold opacity-85" aria-hidden="true">{rain ? `${hr.precipProbability}% rain` : ""}</span>
                {!sel && <RankBar band={band} className="inset-x-2 bottom-1.5" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
        <p>The greener the hour, the better it is for running compared with the rest of the day.</p>
        <WindowLegend withGood={good.size > 0} />
      </div>
    </section>
  );
}
