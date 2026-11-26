---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/pages/embed.astro"]
---

# Surface: Today (home briefing) — `/` and `/embed`

Mode: Operate. Audience: training runners first, casual runners second, on a phone at the door or the night before. Job: decide when to run, how fast, and what to wear in seconds; dig into hours, kit and pace only on demand. Constraints: formulas, data layer, Worker and D1 untouched; no feature removed; WCAG 2.2 AA; halo-ui-react drawers and toasts loaded lazily.

## Direction contract

THESIS: Your training, laid out as a track. Each effort runs in its own lane with today's adjusted pace painted on it, and the verdict sits on the infield. This refuses the weather-app default, where a giant temperature and stacked cards lead with weather, not the run.

OWN-WORLD: Track-rubber oxide red lanes divided by white lane paint with lane numerals in a gutter, an infield-green verdict panel, and a chalk ground (in dark mode the ground is the stadium at night: near-black, with the same rubber and infield deepened). Barlow Condensed for display and lane numerals, Barlow for UI, tabular figures everywhere. Hazards are marked by shape (diamond for caution/warning, octagon for danger) plus words, never by colour alone. Hairlines divide, and only the verdict panel is raised.

STORY: The runner sees "Run 6–7 AM" with the effort and any hazard in one block, glances at their lane's adjusted pace, reads the one-line kit, and leaves. They tap for hours, the full kit, paces, location or logging, and each opens as a spring bottom sheet.

FIRST VIEWPORT (390×844): top bar with the wordmark left and the location chip right (44px). A day selector row. Infield panel: the verdict headline at display scale (best window or "Treadmill day"), the effort line, the conditions line, and hazards inline. Directly attached below it, the five-lane panel (Easy → Interval), lanes as 52px pressable rows showing base struck → adjusted pace, selected lane deeper. Then the hour strip with the best window outlined. A thumb dock pinned to the bottom (safe-area): Hours · Kit · Log run.

FORM: Track Lanes (pick card, #1 of the round-2 grounded list; kept from declined challengers: fixed hour grid, nothing labelled twice, minimal type scale, changed values marked). seed:3deae6d018c46b53

SIGNATURE INTERACTION: Tapping a lane re-dresses the kit and re-paces the verdict, with a spring settle of the lane highlight. Sheets drag with momentum and snap (halo Drawer); press states respond on pointerdown.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Desktop: a two-column deliberate layout (verdict + lanes left; hours table, kit and windows right). Sheets become right-side drawers.
