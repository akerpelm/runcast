import { getConditionIcon, getConditionLabel } from "@/lib/icons";
import { tempDisplay } from "@/lib/display";
import { bandWord, isCurrentHour, isNightHour, shortHour, windowHours } from "@/lib/today/model";
import { RankBar } from "./rank-bar";
import { SvgIcon } from "./svg-icon";
import { WindowLegend } from "./window-legend";
import { useToday } from "./today-context";

/** Desktop: the whole day in one row, shaded by band, so hours compare at a glance. */
export function DayRibbon() {
  const { view, actions } = useToday();
  const { b, bw, prefs, bands } = view;
  const { best, good } = windowHours(bw);
  const now = new Date();

  return (
    <section aria-labelledby="ribbon-title" className="mb-8 hidden lg:block">
      <div className="flex items-end justify-between gap-6">
        <h2 id="ribbon-title" className="font-(family-name:--font-display) text-lg font-bold uppercase tracking-[0.04em]">Your day, hour by hour</h2>
        <div className="flex items-center gap-x-6 text-sm text-muted-foreground">
          <p>The greener the hour, the better it is for running compared with the rest of the day.</p>
          <WindowLegend withGood={good.size > 0} />
        </div>
      </div>
      <ol className="mt-4 grid gap-2 px-1 py-1" style={{ gridTemplateColumns: `repeat(${view.hours.length},minmax(0,1fr))` }}>
        {view.hours.map((hr, idx) => {
          const sel = idx === view.hourIndex;
          const band = bands.get(hr.time);
          const win = best.has(hr.time)
            ? "ring-2 ring-window ring-offset-2 ring-offset-background"
            : good.has(hr.time) ? "outline-2 outline-dashed outline-window outline-offset-2" : "ring-1 ring-hair";
          const fill = sel ? "bg-foreground text-background" : band === undefined ? "run-band-past" : `run-band-${band}`;
          return (
            <li key={hr.time} className="min-w-0">
              <button
                type="button"
                aria-pressed={sel}
                onClick={() => actions.selectHour(idx)}
                className={`press relative flex h-[5rem] w-full flex-col items-center justify-center gap-1 rounded-[10px] pb-1.5 ${fill} ${win}`}
              >
                <span className="text-[0.7rem] font-semibold opacity-85">{isCurrentHour(hr.time, now) ? "Now" : shortHour(hr.time)}</span>
                <SvgIcon svg={getConditionIcon(hr.weatherCode, "h-4 w-4", isNightHour(hr.time, b.daily.sunrise, b.daily.sunset))} />
                <span className="text-[0.8rem] font-bold">
                  {tempDisplay(hr.temperature, prefs.celsius).replace(/[FC]$/, "")}
                  <span className="sr-only">
                    {`, ${bandWord(band)}, ${getConditionLabel(hr.weatherCode)}${best.has(hr.time) ? ", best window" : good.has(hr.time) ? ", also good" : ""}`}
                  </span>
                </span>
                {!sel && <RankBar band={band} className="inset-x-1.5 bottom-1" />}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
