import { EFFORT_LABELS } from "@/lib/state";
import { tempDisplay } from "@/lib/display";
import { dressingFor } from "@/lib/today/model";
import { useToday } from "./today-context";

function KitRow({ label, main, alts }: { label: string; main: string; alts: string[] }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] items-baseline gap-3 border-t border-hair py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>
        <span className="block text-lg leading-snug font-bold">{main}</span>
        {alts.length > 0 && <span className="block text-sm text-muted-foreground">Or {alts.join(", ").toLowerCase()}</span>}
      </dd>
    </div>
  );
}

/** Desktop: kit at a glance; the reasons open in the kit sheet. */
export function KitCompact() {
  const { view, actions } = useToday();
  const { b, prefs } = view;
  const target = dressingFor(b.hour.apparentTemperature, prefs.effort, prefs.runsHot);
  return (
    <section aria-labelledby="aside-kit">
      <h2 id="aside-kit" className="font-(family-name:--font-display) text-lg font-bold uppercase tracking-[0.04em]">What to wear</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dressing for {tempDisplay(target, prefs.celsius)} at {EFFORT_LABELS[prefs.effort].toLowerCase()} effort{prefs.runsHot ? ", runs hot" : ""}
      </p>
      <dl className="mt-2">
        <KitRow label="Legs" main={b.clothing.bottom} alts={b.clothing.bottomAlts || []} />
        <KitRow label="Torso" main={b.clothing.top} alts={b.clothing.topAlts || []} />
        {b.clothing.accessories.length > 0 && <KitRow label="Extras" main={b.clothing.accessories.join(", ")} alts={[]} />}
      </dl>
      <button type="button" onClick={() => actions.openSheet("kit")} className="press mt-1 min-h-11 rounded-full px-3 text-sm font-semibold text-primary hover:bg-muted">
        Why this kit
      </button>
    </section>
  );
}
