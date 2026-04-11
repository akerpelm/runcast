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

  // Compute adjusted feels-like FIRST (needed for annotations)
  const effortOffset = EFFORT_HEAT_OFFSET[ctx.selectedEffort];
  const hotOffset = ctx.runsHot ? 5 : 0;
  const adjustedFeels = getRunnerFeelsLike(h.apparentTemperature) - 15 + effortOffset + hotOffset;

  // Annotate items with WHY context based on current conditions
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
  const factorStr = factors.length ? ` · ${factors.join(", ")}` : "";

  // Tags using Starwind badge
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
    <div class="bg-card text-card-foreground card-surface flex flex-col gap-4 py-4 px-5 accent-stripe" data-slot="card" data-size="sm">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm font-semibold text-foreground">What to Wear</p>
        ${effortTag}${hotTag}
      </div>
      <p class="text-xs text-muted-foreground -mt-2">${td(h.apparentTemperature)} feels-like + ${tdd(effortOffset)} effort${hotOffset > 0 ? ` + ${tdd(hotOffset)} hot` : ""} = dressing for ${td(adjustedFeels)}${factorStr}</p>
      <div class="space-y-3">
        ${zones.map(zone => {
          const isCore = zone.label === "LEGS" || zone.label === "TORSO";
          return `<div>
            <p class="mb-1.5 text-[10px] font-medium uppercase tracking-wider ${isCore ? "text-primary" : "text-muted-foreground"}">${zone.label}</p>
            <div class="flex flex-wrap items-center gap-2">
              ${zone.items.map(it => {
                const primary = `<span class="starwind-badge inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${isCore ? "border-primary/20 border" : "border-border/60 border"} bg-background px-3 py-1.5 text-sm text-foreground" data-slot="badge">${esc(it.value)}${it.reason ? `<span class="text-xs text-muted-foreground font-normal">${esc(it.reason)}</span>` : ""}</span>`;
                if (it.alts.length === 0) return primary;
                const altsStr = it.alts.map(a => esc(a)).join(" · ");
                return `${primary}<span class="text-xs text-muted-foreground">or ${altsStr}</span>`;
              }).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}
