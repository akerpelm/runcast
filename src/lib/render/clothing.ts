/**
 * Render: Clothing zones
 */
import type { HourBriefing, RenderContext } from "../state";
import { EFFORT_LABELS, EFFORT_HEAT_OFFSET } from "../state";
import { esc, tempDisplay, tempDeltaDisplay, speedDisplay } from "../display";
import { getRunnerFeelsLike } from "../formulas/clothing";
import { htmlBadge } from "./starwind-html";

export function renderClothing(b: HourBriefing, ctx: RenderContext): string {
  const h = b.hour;

  const td = (f: number) => tempDisplay(f, ctx.useCelsius);
  const tdd = (fDelta: number) => tempDeltaDisplay(fDelta, ctx.useCelsius);
  const sd = (mph: number) => speedDisplay(mph, ctx.useMetric);

  // Compute adjusted feels-like
  const effortOffset = EFFORT_HEAT_OFFSET[ctx.selectedEffort];
  const hotOffset = ctx.runsHot ? 5 : 0;
  const adjustedFeels = getRunnerFeelsLike(h.apparentTemperature) - 15 + effortOffset + hotOffset;

  // Annotate items with WHY context
  function annotate(item: string, isClothing: boolean): { value: string; reason: string } {
    if (item.includes("Wind-resistant"))
      return { value: item, reason: `${sd(h.windSpeed)} winds` };
    if (item.includes("Water-resistant") || item.includes("Waterproof"))
      return { value: item, reason: `${h.precipProbability}% precip` };
    if (item === "Sunscreen")
      return { value: item, reason: `UV ${h.uvIndex}` };
    if (item.includes("Brimmed cap"))
      return { value: item, reason: "Cold rain" };
    if (item === "High-vis vest") {
      const visMi = h.visibility / 1609;
      return { value: item, reason: visMi < 3 ? `Vis ${visMi < 1 ? "<1" : Math.round(visMi)} mi` : "After dark" };
    }
    if (item === "Reflective vest" || item === "Headlamp") {
      const visMi = h.visibility / 1609;
      if (visMi < 3) return { value: item, reason: `Vis ${visMi < 1 ? "<1" : Math.round(visMi)} mi` };
      return { value: item, reason: "After dark" };
    }
    if (item.includes("Balaclava") || item.includes("Face coverage"))
      return { value: item, reason: `Wind chill ${td(b.windChill)}` };
    if ((item === "Lightweight cap" || item === "Sunglasses") && h.uvIndex >= 6)
      return { value: item, reason: `UV ${h.uvIndex}` };
    if (isClothing || item.includes("loves") || item.includes("Beanie") ||
        item.includes("ear cover") || item.includes("Neck gaiter") ||
        item.includes("Arm sleeves") || item.includes("Headband"))
      return { value: item, reason: `${td(adjustedFeels)}` };
    return { value: item, reason: "" };
  }

  const items = [
    { label: "Bottom", ...annotate(b.clothing.bottom, true), alts: b.clothing.bottomAlts || [] },
    { label: "Top", ...annotate(b.clothing.top, true), alts: b.clothing.topAlts || [] },
    ...b.clothing.accessories.map(a => ({ label: "Gear", ...annotate(a, false), alts: [] as string[] })),
  ];

  // Key factors summary
  const factors: string[] = [];
  if (h.windSpeed > 15) factors.push(`${sd(h.windSpeed)} wind`);
  if (h.precipitation > 0 || h.precipProbability > 40) factors.push(`${h.precipProbability}% rain`);
  if (h.uvIndex >= 6) factors.push(`UV ${h.uvIndex}`);
  if (b.iceRisk.risk !== "NONE") factors.push(`${b.iceRisk.risk.toLowerCase()} ice risk`);
  const factorStr = factors.length ? ` \u00b7 ${factors.join(", ")}` : "";

  // Tags
  const effortTag = ctx.selectedEffort !== "easy"
    ? htmlBadge(EFFORT_LABELS[ctx.selectedEffort], { variant: "primary", size: "sm" })
    : "";
  const hotTag = ctx.runsHot
    ? htmlBadge("Runs hot", { variant: "warning", size: "sm" })
    : "";

  // Group items by zone
  const zones: { label: string; items: typeof items }[] = [
    { label: "LEGS", items: items.filter(it => it.label === "Bottom") },
    { label: "TORSO", items: items.filter(it => it.label === "Top") },
    { label: "EXTRAS", items: items.filter(it => it.label === "Gear") },
  ].filter(z => z.items.length > 0);

  return `
    <div class="bg-card text-card-foreground card-surface p-5" data-slot="card">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm font-semibold text-foreground">What to Wear</p>
        ${effortTag}${hotTag}
      </div>
      <p class="text-xs text-muted-foreground mt-1">${td(h.apparentTemperature)} feels-like + ${tdd(effortOffset)} effort${hotOffset > 0 ? ` + ${tdd(hotOffset)} hot` : ""} = dressing for ${td(adjustedFeels)}${factorStr}</p>
      <div class="mt-3 grid gap-3 ${zones.length >= 3 ? "sm:grid-cols-3" : zones.length === 2 ? "sm:grid-cols-2" : ""}">
        ${zones.map(zone => {
          return `<div>
            <p class="mb-1.5 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">${zone.label}</p>
            <div class="space-y-2">
              ${zone.items.map(it => {
                const reasonHTML = it.reason ? `<span class="text-xs text-muted-foreground font-normal">${esc(it.reason)}</span>` : "";
                const altsHTML = it.alts.length > 0 ? `<p class="mt-1 text-xs text-muted-foreground">or ${it.alts.map(a => esc(a)).join(" \u00b7 ")}</p>` : "";
                return `<div class="rounded-[var(--radius-inner)] bg-muted border-l-2 border-primary px-3 py-2">
                  <p class="text-sm font-semibold text-foreground">${esc(it.value)} ${reasonHTML}</p>
                  ${altsHTML}
                </div>`;
              }).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}
