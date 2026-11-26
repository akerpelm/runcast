import { getConditionLabel, hazardMark, shirtIcon } from "@/lib/icons";
import { speedDisplay, tempDisplay } from "@/lib/display";
import { daylightNote, runTypeCopy, verdictContext, verdictHeadline } from "@/lib/today/model";
import { SvgIcon } from "./svg-icon";
import { useToday } from "./today-context";

function Pill({ children }: { children: string }) {
  return <span className="rounded-full bg-white px-3 py-1.5 text-[0.95rem] leading-tight font-bold text-[#16181a]">{children}</span>;
}

export function VerdictPanel() {
  const { view, actions } = useToday();
  const { b, bw, prefs, isBestHour } = view;
  const h = b.hour;
  const td = (f: number) => tempDisplay(f, prefs.celsius);
  const indoor = b.runType.type === "TREADMILL";

  const facts = [
    `${td(h.temperature)}, feels like ${td(h.apparentTemperature)}`,
    getConditionLabel(h.weatherCode).toLowerCase(),
    h.windSpeed >= 5 ? `wind ${speedDisplay(h.windSpeed, prefs.metric)}` : "calm",
  ].join(", ");
  const dark = daylightNote(h.time, b.daily.sunrise, b.daily.sunset, b.daylight.sunset);
  const context = verdictContext(bw, isBestHour);
  const alerts = b.safetyAlerts.filter((a) => a.severity !== "info").slice(0, 2);
  const extraAlerts = b.safetyAlerts.length - alerts.length;
  const extras = b.clothing.accessories;

  return (
    <section
      key={view.day}
      aria-labelledby="verdict-title"
      data-surface="color"
      className={`verdict-enter relative z-10 rounded-[20px] px-5 pt-5 pb-6 text-white shadow-[var(--shadow-raised)] ${indoor ? "bg-indoor" : "bg-infield"}`}
    >
      <h2 id="verdict-title" className="font-(family-name:--font-display) text-[3.25rem] leading-[0.92] font-extrabold uppercase tracking-[-0.01em] sm:text-[4rem]">
        {verdictHeadline(b.runType.type, h.time, bw, isBestHour)}
      </h2>
      <p className="mt-3 text-lg font-semibold">{runTypeCopy(b.runType.type, b.runType.reason)}</p>
      <p className="mt-1 text-balance text-[0.95rem] text-infield-muted">{`${facts}.${dark ? ` ${dark}.` : ""}`}</p>
      {context && <p className="mt-1 text-[0.95rem] font-semibold">{context}</p>}

      {alerts.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-white/20 pt-4 text-[0.95rem] leading-snug">
          {alerts.map((a) => (
            <li key={a.title}>
              <button type="button" onClick={() => actions.openSheet("hours")} className="press -mx-2 flex w-[calc(100%+1rem)] gap-3 rounded-[12px] px-2 py-1 text-left hover:bg-white/10">
                <SvgIcon svg={hazardMark(a.severity)} />
                <span className="min-w-0">
                  <span className="line-clamp-2 lg:line-clamp-none">
                    <span className="font-semibold">{a.title}.</span> <span className="text-infield-muted">{a.message}</span>
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold underline decoration-white/40 underline-offset-4 lg:hidden">Full details</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {extraAlerts > 0 && (
        <button type="button" onClick={() => actions.openSheet("hours")} className="press mt-3 inline-flex min-h-11 items-center rounded-full bg-white/15 px-4 text-sm font-semibold hover:bg-white/25">
          {extraAlerts} more condition note{extraAlerts > 1 ? "s" : ""}
        </button>
      )}

      <div className="mt-4 border-t border-white/20 pt-3 lg:hidden">
        <button type="button" onClick={() => actions.openSheet("kit")} className="press -mx-2 w-[calc(100%+1rem)] rounded-[14px] px-2 py-1.5 text-left hover:bg-white/10">
          <span className="flex items-center gap-2 text-sm font-semibold text-infield-muted">
            <SvgIcon svg={shirtIcon} />
            What to wear
          </span>
          <span className="mt-2 flex flex-wrap gap-2">
            <Pill>{b.clothing.bottom}</Pill>
            <span className="sr-only">, </span>
            <Pill>{b.clothing.top}</Pill>
            {extras.length > 0 && (
              <span className="rounded-full border border-white/50 px-3 py-1.5 text-[0.95rem] leading-tight font-semibold">
                +{extras.length} more<span className="sr-only">: {extras.join(", ")}</span>
              </span>
            )}
          </span>
        </button>
      </div>
    </section>
  );
}
