import { formatTime } from "@/lib/formulas/daylight";
import { getDayLabel, speedDisplay, tempDisplay } from "@/lib/display";
import { hourLabel } from "@/lib/today/model";
import { useToday } from "./today-context";

/** Desktop: the selected hour's facts in a two-column grid. */
export function ConditionsGrid() {
  const { view } = useToday();
  const { b, prefs } = view;
  const h = b.hour;
  const td = (f: number) => tempDisplay(f, prefs.celsius);
  const sd = (mph: number) => speedDisplay(mph, prefs.metric);
  const facts: [string, string][] = [
    ["Feels like", td(h.apparentTemperature)],
    ["Wind", `${sd(h.windSpeed)}, gusts ${sd(h.windGusts)}`],
    ["Rain chance", `${h.precipProbability}%`],
    ["Dew point", `${td(h.dewPoint)} (${Math.round(h.humidity)}% humidity)`],
    ["Air quality", b.aqiForHour !== undefined ? `AQI ${b.aqiForHour}` : "n/a"],
    ["UV index", `${h.uvIndex}`],
    ["Daylight", `${b.daylight.sunrise}–${b.daylight.sunset}`],
    b.nextRain
      ? ["Next rain", `${getDayLabel(b.nextRain.time.slice(0, 10))} ${formatTime(new Date(b.nextRain.time))}`]
      : ["Visibility", prefs.metric ? `${(h.visibility / 1000).toFixed(0)} km` : `${(h.visibility / 1609).toFixed(0)} mi`],
  ];
  return (
    <section aria-labelledby="aside-cond">
      <h2 id="aside-cond" className="font-(family-name:--font-display) text-lg font-bold uppercase tracking-[0.04em]">Conditions at {hourLabel(h.time)}</h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-6">
        {facts.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-t border-hair py-1.5">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="text-right text-[0.95rem] font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-sm">
        <span className="font-semibold">Why this call:</span> <span className="text-muted-foreground">{b.runType.reason}</span>
      </p>
    </section>
  );
}
