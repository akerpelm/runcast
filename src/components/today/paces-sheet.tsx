import { useState, type FormEvent } from "react";
import { EFFORTS, EFFORT_LABELS, EMPTY_PACES, parsePace, type EffortLevel } from "@/lib/state";
import { paceForDisplay, paceUnit } from "@/lib/display";
import { formatPace } from "@/lib/formulas/pace";
import { useToday } from "./today-context";
import { fieldClass, primaryButtonClass } from "./field";

export function PacesSheet() {
  const { view, actions } = useToday();
  const { prefs } = view;
  const pu = paceUnit(prefs.metric);
  const [values, setValues] = useState<Record<EffortLevel, string>>(() =>
    Object.fromEntries(EFFORTS.map((e) => [e, prefs.paces[e] > 0 ? formatPace(paceForDisplay(prefs.paces[e], prefs.metric)) : ""])) as Record<EffortLevel, string>,
  );
  const [error, setError] = useState<{ effort: EffortLevel; message: string } | null>(null);

  function save(e: FormEvent) {
    e.preventDefault();
    const next = { ...EMPTY_PACES };
    for (const effort of EFFORTS) {
      const raw = values[effort].trim();
      if (!raw) continue;
      const parsed = parsePace(raw);
      if (parsed <= 0) {
        setError({ effort, message: `Check the ${EFFORT_LABELS[effort].toLowerCase()} pace. Use minutes and seconds, like 8:30.` });
        document.getElementById(`pace-${effort}`)?.focus();
        return;
      }
      next[effort] = prefs.metric ? Math.round(parsed * 1.609344) : parsed;
    }
    actions.savePaces(next);
    actions.closeSheet();
    actions.notify("success", Object.values(next).some((v) => v > 0) ? "Paces saved" : "Paces cleared");
  }

  return (
    <form onSubmit={save} noValidate>
      <p className="text-[0.95rem] text-muted-foreground">
        Enter the paces you train at, and each lane shows how today's weather changes them. Type <span className="font-semibold text-foreground">830</span> for 8:30. Leave any you don't use blank.
      </p>
      <div className="mt-3">
        {EFFORTS.map((e, i) => (
          <div key={e} className="grid grid-cols-[2.5rem_1fr_7.5rem] items-center gap-3 border-t border-hair py-2">
            <span className="flex h-11 items-center justify-center rounded-[10px] bg-track font-(family-name:--font-display) text-xl font-extrabold text-track-ink" aria-hidden="true">{i + 1}</span>
            <label htmlFor={`pace-${e}`} className="text-base font-semibold">
              {EFFORT_LABELS[e]}
              <span className="block text-sm font-normal text-muted-foreground">min:sec {pu}</span>
            </label>
            <input
              id={`pace-${e}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="m:ss"
              value={values[e]}
              aria-invalid={error?.effort === e}
              aria-describedby={error?.effort === e ? "pace-error" : undefined}
              onChange={(ev) => {
                setValues((v) => ({ ...v, [e]: ev.target.value }));
                if (error?.effort === e) setError(null);
              }}
              onBlur={() => {
                // Phone number pads have no colon, so "830" is tidied to "8:30" once the field is left.
                const secs = parsePace(values[e]);
                if (secs > 0) setValues((v) => ({ ...v, [e]: formatPace(secs) }));
              }}
              className={`${fieldClass} text-center font-semibold tabular-nums`}
            />
          </div>
        ))}
      </div>
      <p id="pace-error" className="mt-2 min-h-5 text-sm font-semibold text-error" role="alert">{error?.message}</p>
      <div className="flex items-center justify-between gap-4 border-t border-hair py-4">
        <span id="runs-hot-label" className="text-base font-semibold">
          I run hot<span className="block text-sm font-normal text-muted-foreground">Dress about 5° lighter</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.runsHot}
          aria-labelledby="runs-hot-label"
          onClick={() => actions.setRunsHot(!prefs.runsHot)}
          className={`press relative inline-flex h-8 w-14 shrink-0 items-center rounded-full ${prefs.runsHot ? "bg-infield" : "bg-input"}`}
        >
          <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.runsHot ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>
      <div className="sticky bottom-0 -mx-1 bg-[var(--raised)] px-1 pt-2 pb-1">
        <button type="submit" className={`${primaryButtonClass} w-full`}>
          Save paces
        </button>
      </div>
    </form>
  );
}
