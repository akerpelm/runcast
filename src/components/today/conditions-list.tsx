import { formatTime } from "@/lib/formulas/daylight";
import { checkIcon, hazardMark } from "@/lib/icons";
import { getDayLabel, speedDisplay, tempDisplay } from "@/lib/display";
import { SvgIcon } from "./svg-icon";
import { useToday } from "./today-context";

/** Full conditions for the selected hour, with every safety note. */
export function ConditionsList() {
  const { view } = useToday();
  const { b, prefs } = view;
  const h = b.hour;
  const td = (f: number) => tempDisplay(f, prefs.celsius);
  const sd = (mph: number) => speedDisplay(mph, prefs.metric);
  const rows: [string, string][] = [
    ["Temperature", `${td(h.temperature)} (feels ${td(h.apparentTemperature)})`],
    ["Wind", `${sd(h.windSpeed)}, gusts ${sd(h.windGusts)}`],
    ["Rain chance", `${h.precipProbability}%`],
    ["Humidity", `${Math.round(h.humidity)}%, dew point ${td(h.dewPoint)}`],
    ["UV index", `${h.uvIndex}`],
    ["Air quality", b.aqiForHour !== undefined ? `AQI ${b.aqiForHour} (${b.aqiCategory})` : "Not available"],
    ["Visibility", prefs.metric ? `${(h.visibility / 1000).toFixed(0)} km` : `${(h.visibility / 1609).toFixed(0)} mi`],
    ["Daylight", `${b.daylight.sunrise} to ${b.daylight.sunset}`],
  ];
  if (b.nextThunderstorm) rows.push(["Thunderstorm", `${getDayLabel(b.nextThunderstorm.slice(0, 10))} ${formatTime(new Date(b.nextThunderstorm))}`]);
  else if (b.nextRain) rows.push(["Next rain", `${getDayLabel(b.nextRain.time.slice(0, 10))} ${formatTime(new Date(b.nextRain.time))} (${b.nextRain.prob}%)`]);

  return (
    <>
      {b.safetyAlerts.length ? (
        <ul className="mb-4 space-y-3">
          {b.safetyAlerts.map((a) => (
            <li key={a.title} className="flex gap-3">
              <SvgIcon svg={hazardMark(a.severity)} />
              <p>
                <span className="font-semibold">{a.title}.</span> <span className="text-muted-foreground">{a.message}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 flex items-center gap-2 text-[0.95rem] font-semibold text-infield dark:text-secondary">
          <SvgIcon svg={checkIcon} />
          No safety concerns for this hour
        </p>
      )}
      <p className="mb-2 text-[0.95rem]">
        <span className="font-semibold">Why this call:</span> <span className="text-muted-foreground">{b.runType.reason}</span>
      </p>
      <dl className="grid grid-cols-[auto_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="border-t border-hair py-2.5 pr-6 text-sm text-muted-foreground">{k}</dt>
            <dd className="border-t border-hair py-2.5 text-right text-[0.95rem] font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
