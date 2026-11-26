import { EFFORTS, EFFORT_LABELS } from "@/lib/state";
import { paceUnit } from "@/lib/display";
import { paceAdjLabel, paceTitle } from "@/lib/today/model";
import { useToday } from "./today-context";

export function EffortLanes() {
  const { view, actions } = useToday();
  const { b, prefs } = view;
  const pu = paceUnit(prefs.metric);
  const byEffort = new Map(b.adjustedPaces.map((p) => [p.effort, p]));
  const hasAny = b.adjustedPaces.length > 0;

  return (
    <section aria-labelledby="lanes-title" data-surface="color" className="-mt-4 rounded-b-[20px] bg-track pt-4 text-track-ink">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-2">
        <div>
          <h2 id="lanes-title" className="font-(family-name:--font-display) text-lg font-bold uppercase tracking-[0.04em]">{paceTitle(view.dayLabel)}</h2>
          <p className="text-sm text-track-muted">
            {paceAdjLabel(b.paceAdjustment, b.hour.windSpeed)}
            {hasAny ? "" : ". Add your paces to see adjusted times"}
          </p>
        </div>
        {view.embed ? (
          <span className="rounded-full bg-black/15 px-3 py-1 text-sm font-semibold">Sample paces</span>
        ) : hasAny ? (
          <button type="button" onClick={() => actions.openSheet("paces")} className="press min-h-11 rounded-full px-4 text-sm font-semibold text-track-ink underline decoration-white/50 underline-offset-4 hover:bg-black/10">
            Edit paces
          </button>
        ) : (
          <button type="button" onClick={() => actions.openSheet("paces")} className="press min-h-11 rounded-full bg-white px-4 text-sm font-bold text-track-deep hover:bg-white/90">
            Add your paces
          </button>
        )}
      </div>
      <ul className="pb-2" aria-label="Effort lanes. Selecting one adjusts your kit.">
        {EFFORTS.map((e, i) => {
          const sel = e === prefs.effort;
          const p = byEffort.get(e);
          return (
            <li key={e} className="relative">
              <button
                type="button"
                aria-pressed={sel}
                onClick={() => actions.selectEffort(e)}
                className={`press group relative grid min-h-[3.25rem] w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center border-t-2 border-white/90 pr-4 text-left text-track-ink ${sel ? "" : "hover:bg-black/10"}`}
              >
                {/* Keyed on the effort so the highlight remounts and plays its settle animation. */}
                {sel && <span key={e} className="lane-settle absolute inset-0 bg-track-deep" aria-hidden="true" />}
                <span className="relative flex h-full items-center justify-center border-r-2 border-white/90 font-(family-name:--font-display) text-2xl font-extrabold">{i + 1}</span>
                <span className="relative truncate pl-3 text-base font-semibold">
                  {EFFORT_LABELS[e]}
                  {sel && <span className="sr-only"> (selected)</span>}
                </span>
                <span className="relative">
                  {p ? (
                    <span className="flex items-baseline gap-2 whitespace-nowrap">
                      <s className="text-sm text-track-muted decoration-1">
                        <span className="sr-only">from </span>
                        {p.base}
                      </s>
                      <span className="font-(family-name:--font-display) text-[1.3rem] leading-none font-bold">{p.adjusted}</span>
                      <span className="text-xs text-track-muted">{pu}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-track-muted">No pace set</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
