import { EFFORT_HEAT_OFFSET, EFFORT_LABELS } from "@/lib/state";
import { speedDisplay, tempDeltaDisplay, tempDisplay } from "@/lib/display";
import { dressingFor } from "@/lib/today/model";
import { useToday } from "./today-context";

/** Full kit with alternatives and the reason for each item. */
export function KitSheet() {
  const { view } = useToday();
  const { b, prefs } = view;
  const h = b.hour;
  const td = (f: number) => tempDisplay(f, prefs.celsius);
  const target = dressingFor(h.apparentTemperature, prefs.effort, prefs.runsHot);
  const visMi = h.visibility / 1609;

  function reason(item: string): string {
    if (item.includes("Wind-resistant")) return `${speedDisplay(h.windSpeed, prefs.metric)} wind`;
    if (item.includes("Water-resistant") || item.includes("Waterproof")) return `${h.precipProbability}% chance of rain`;
    if (item === "Sunscreen") return `UV ${h.uvIndex}`;
    if (item.includes("Brimmed cap")) return "Cold rain";
    if (item === "High-vis vest" || item === "Reflective vest" || item === "Headlamp") {
      return visMi < 3 ? `Visibility ${visMi < 1 ? "under 1" : Math.round(visMi)} mi` : "After dark";
    }
    if (item.includes("Balaclava") || item.includes("Face coverage")) return `Wind chill ${td(b.windChill)}`;
    if ((item === "Lightweight cap" || item === "Sunglasses") && h.uvIndex >= 6) return `UV ${h.uvIndex}`;
    return `For ${td(target)}`;
  }

  const zone = (label: string, main: string, alts: string[]) => (
    <div className="border-t border-hair py-4">
      <h3 className="font-(family-name:--font-body) text-sm font-semibold text-muted-foreground">{label}</h3>
      <p className="mt-1 text-lg font-bold">{main}</p>
      <p className="text-sm text-muted-foreground">{reason(main)}</p>
      {alts.length > 0 && <p className="text-sm text-muted-foreground">Or {alts.join(", ").toLowerCase()}</p>}
    </div>
  );

  const effortOffset = EFFORT_HEAT_OFFSET[prefs.effort];
  const math = `Feels like ${td(h.apparentTemperature)}, plus ${tempDeltaDisplay(effortOffset, prefs.celsius)} for ${EFFORT_LABELS[prefs.effort].toLowerCase()} effort${prefs.runsHot ? `, plus ${tempDeltaDisplay(5, prefs.celsius)} because you run hot` : ""}: dress for ${td(target)}.`;

  return (
    <>
      <p className="text-[0.95rem] text-muted-foreground">{math}</p>
      <div className="mt-3">
        {zone("Legs", b.clothing.bottom, b.clothing.bottomAlts || [])}
        {zone("Torso", b.clothing.top, b.clothing.topAlts || [])}
        {b.clothing.accessories.length > 0 && (
          <div className="border-t border-hair py-4">
            <h3 className="font-(family-name:--font-body) text-sm font-semibold text-muted-foreground">Extras</h3>
            <ul className="mt-2 space-y-2">
              {b.clothing.accessories.map((a) => (
                <li key={a} className="flex items-baseline justify-between gap-4">
                  <span className="text-base font-semibold">{a}</span>
                  <span className="text-sm text-muted-foreground">{reason(a)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
