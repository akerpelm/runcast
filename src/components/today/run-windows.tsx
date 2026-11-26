import { EFFORT_LABELS } from "@/lib/state";
import { distDisplay } from "@/lib/display";
import { timeRange } from "@/lib/today/model";
import { useToday } from "./today-context";

export function RunWindows() {
  const { view } = useToday();
  const { b, bw, prefs } = view;
  if (!bw.ranked.length) return <p className="text-sm text-muted-foreground">No run windows left for this day.</p>;

  const pace = prefs.paces[prefs.effort] || prefs.paces.easy;
  const minsToSunset = (new Date(b.daily.sunset).getTime() - new Date(b.hour.time).getTime()) / 60000;
  const showSunset = pace > 0 && minsToSunset > 0 && minsToSunset < 480;

  return (
    <>
      <ul>
        {bw.ranked.map((w) => (
          <li key={w.startHour} className="flex items-start gap-3 border-t border-hair py-3">
            <span className={`mt-0.5 inline-flex min-w-14 justify-center rounded-full px-2 py-0.5 text-xs font-bold ${w.label === "Best" ? "bg-infield text-white" : "border border-hair text-foreground"}`}>{w.label}</span>
            <div>
              <p className="text-base font-bold">{timeRange(w.startHour, w.endHour)}</p>
              <p className="text-sm text-muted-foreground">{w.summary}</p>
            </div>
          </li>
        ))}
      </ul>
      {showSunset && (
        <p className="mt-2 text-sm text-muted-foreground">
          About {distDisplay(minsToSunset / (pace / 60), prefs.metric)} at {EFFORT_LABELS[prefs.effort].toLowerCase()} pace before sunset.
        </p>
      )}
    </>
  );
}
