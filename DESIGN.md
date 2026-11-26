---
name: Should I Run
description: A daily running briefing laid out as a running track — verdict on the infield, your efforts in the lanes.
colors:
  chalk: "#f3f1eb"
  chalk-raised: "#fbfaf6"
  chalk-muted: "#e9e6dd"
  ink: "#16181a"
  ink-muted: "#5c5850"
  hair: "#dcd7cc"
  field-edge: "#cfc9bc"
  track-rubber: "#a83f2a"
  track-rubber-deep: "#7f2e1f"
  track-rubber-muted: "#f6d9d0"
  infield: "#1c5a39"
  infield-muted: "#cfe6d8"
  indoor: "#2b2e31"
  caution: "#f0b429"
  danger: "#b3261e"
  run-band-0: "#1c5a39"
  run-band-1: "#2f7a50"
  run-band-2: "#86bb98"
  run-band-3: "#c3dfcb"
  run-band-4: "#e6e4dc"
  night-ground: "#0f1110"
  night-raised: "#181b19"
  night-muted: "#1f2321"
  night-ink: "#edebe4"
  night-ink-muted: "#a7a39a"
  night-hair: "#2a2e2b"
  night-track-rubber: "#8e3626"
  night-track-rubber-deep: "#6b281c"
  night-track-rubber-muted: "#f2cfc4"
  night-infield: "#16492f"
  night-infield-muted: "#c9e3d3"
  night-signal-green: "#6fc395"
  night-oxide-text: "#e07a62"
  night-run-band-0: "#79d0a0"
  night-run-band-1: "#4fa577"
  night-run-band-2: "#2c6a49"
  night-run-band-3: "#1f4331"
  night-run-band-4: "#1b201d"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.01em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    letterSpacing: "0.04em"
  numeral:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  pace:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    fontFeature: "tnum"
  body-strong:
    fontFamily: "Barlow, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    fontFeature: "tnum"
  label:
    fontFamily: "Barlow, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    fontFeature: "tnum"
rounded:
  band: "4px"
  cell: "10px"
  field: "12px"
  hour: "14px"
  panel: "20px"
  pill: "9999px"
spacing:
  gutter: "16px"
  gutter-sm: "24px"
  sheet: "20px"
  section: "24px"
  column-gap: "40px"
  lane-height: "52px"
  target: "44px"
components:
  verdict-panel:
    backgroundColor: "{colors.infield}"
    textColor: "#ffffff"
    typography: "{typography.display}"
    rounded: "{rounded.panel}"
    padding: "20px 20px 24px"
  verdict-panel-indoor:
    backgroundColor: "{colors.indoor}"
    textColor: "#ffffff"
  lane:
    backgroundColor: "{colors.track-rubber}"
    textColor: "#ffffff"
    typography: "{typography.body-strong}"
    height: "52px"
  lane-selected:
    backgroundColor: "{colors.track-rubber-deep}"
    textColor: "#ffffff"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.track-rubber}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "44px"
  day-tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  day-tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
  hour-cell:
    backgroundColor: "{colors.run-band-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.hour}"
    width: "60px"
    height: "100px"
  hour-cell-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
  input:
    backgroundColor: "{colors.chalk-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "48px"
  location-chip:
    backgroundColor: "{colors.chalk-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "44px"
  window-tag-best:
    backgroundColor: "{colors.infield}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: Should I Run

## Overview

**Creative North Star: "Track Lanes"**

The runner's day is laid out as a running track. The answer sits on the infield: a single raised green panel carrying the verdict ("Run 6–7 AM", or "Treadmill day") at condensed display scale. Directly beneath it, fused to its bottom edge, the five effort lanes run in oxide-red track rubber, divided by white lane paint, each numbered in a gutter and carrying today's condition-adjusted pace painted over the struck-through base pace. Everything else (hours, kit, conditions, windows) lives on a flat chalk ground, divided by hairlines and opened on demand in spring-loaded sheets.

The system is dense, legible and athletic rather than meteorological. It refuses the weather-app default of a giant temperature over stacked cards: weather appears only as the reasoning behind the run. Night mode is the stadium after dark, a near-black ground with the same rubber and infield deepened, never an inverted copy of day.

Colour is reserved for things a runner acts on. Green means the infield and the answer; red rubber means your efforts; amber and signal red appear only on hazard marks. Every coloured meaning is doubled by shape, position or words.

**Key Characteristics:**
- One raised object per screen: the infield verdict panel.
- Lanes as full-bleed pressable rows (52px), lane paint as dividers, numerals in a gutter.
- Chalk ground with hairline dividers; no cards inside cards.
- Barlow Condensed uppercase for headings, numerals and paces; Barlow for everything else; tabular figures everywhere.
- Hazards marked by shape (diamond, octagon) plus words.
- Hour quality as five ranked green bands, each with a rank bar and screen-reader words.
- Sheets for depth: bottom sheets on phones, right-side drawers on desktop.

## Colors

A warm chalk ground with two saturated surfaces borrowed from a stadium (track rubber and infield grass) and a strictly rationed hazard pair. Light and night values are both normative; the night set is prefixed `night-`.

### Primary
- **Track Rubber** (`track-rubber`): the lane panel and every lane row; the logo tile; the text-link and pin colour on chalk. White lane paint (90% white) divides it.
- **Deep Rubber** (`track-rubber-deep`): the selected lane only. It settles in from the left when a lane is chosen.
- **Rubber Chalk** (`track-rubber-muted`): secondary text on rubber — struck base paces, units, the adjustment line.
- **Night Oxide** (`night-oxide-text`): the rubber hue lifted for text and links on the night ground; the night lane panel itself uses `night-track-rubber`.

### Secondary
- **Infield Green** (`infield`): the verdict panel, the "Best" window tag, the runs-hot switch on, the precise-location button, the focus outline in light mode, text selection.
- **Infield Mist** (`infield-muted`): secondary text on the infield (the conditions line, hazard detail).
- **Signal Green** (`night-signal-green`): the night outline, focus and window-ring colour, and green text on the night ground.
- **Indoor Slate** (`indoor`): replaces the infield on a "Treadmill day" verdict.

### Tertiary (hazard pair)
- **Caution Amber** (`caution`): fill of the diamond hazard mark (caution and warning), with an ink stroke and ink glyph; the approximate-location dot.
- **Danger Red** (`danger`): fill of the octagon hazard mark, with white stroke and glyph; form error text uses the related error token.

### Run bands
Five shades of infield green ranking each hour against the rest of its day (`run-band-0` best … `run-band-4` worst). In light mode darker is better; at night brighter is better (`night-run-band-0` … `-4`). Each band has a paired ink (white on 0–1, ink on 2–4 by day; ink on 0–1, white or chalk on 2–4 by night), and every band/ink pair is at least 5:1. Hours already passed drop the fill for a dashed edge at 60% opacity.

### Neutral
- **Chalk** (`chalk`): page ground.
- **Raised Chalk** (`chalk-raised`): sheets, drawers, toasts, inputs, the location chip.
- **Worn Chalk** (`chalk-muted`): hover fills, segmented-control tracks, inset summaries, close buttons.
- **Ink** (`ink`) / **Ink Muted** (`ink-muted`): primary and secondary text; ink also fills the active day tab, the selected hour and primary buttons.
- **Hairline** (`hair`): every divider and cell outline. **Field Edge** (`field-edge`): input borders and the off state of switches.

### Named Rules
**The Infield Rule.** Green surfaces carry the answer. Only the verdict, the best window and confirmations are green; decoration never is.

**The Paired Ink Rule.** Every fill ships with its ink. Text pairs are ≥4.5:1 everywhere and band text is ≥5:1; a new fill without a checked ink is not done.

**The Never-Colour-Alone Rule.** Hazards are a shape plus words; bands are a rank bar plus screen-reader words; best and good windows are a solid and a dashed outline. Strip the colour and every meaning survives.

## Typography

**Display Font:** Barlow Condensed (600, 700, 800), sans-serif fallback
**Body Font:** Barlow (400, 500, 600, 700), sans-serif fallback

**Character:** Condensed, uppercase display type reads like stadium signage and lane numbering; plain Barlow keeps everything else quiet and readable at the door. Tabular figures are set on `body`, so every time, pace and temperature aligns.

### Hierarchy
- **Display** (800, 3.25rem → 4rem from 640px, line-height 0.92, uppercase, -0.01em): the verdict headline only.
- **Headline** (800, 1.6rem, 1.1, uppercase): sheet and drawer titles.
- **Title** (700, 1.125rem, uppercase, 0.04em): section headings ("Today's pace", "Hour by hour", "What to wear").
- **Numeral** (800, 1.5rem): lane numbers in the gutter; the same face in the logo wordmark (1.2–1.35rem).
- **Pace** (700, 1.3rem): adjusted paces on the lanes.
- **Body** (400–600, 0.95–1rem): verdict lines, lane names, kit, conditions, sheet copy. The effort line under the verdict steps up to 1.125rem/600.
- **Label** (600, 0.875rem): tabs, chips, legends, field labels, data keys. Hour-cell labels go down to 0.7–0.75rem.

### Named Rules
**The Family-Name Rule.** Apply the faces with `font-(family-name:--font-display)` / `font-(family-name:--font-body)`. In Tailwind v4, `font-(--font-display)` compiles to a font-weight declaration, not a family, and silently does nothing useful.

**The Condensed-Is-Signage Rule.** Barlow Condensed is for headings, numerals and paces. In-sheet step titles and kit zone labels stay in Barlow.

## Layout

Mobile-first in a single column with a 16px gutter (24px from 640px), capped at 1152px (`max-w-6xl`); content pages cap at 896px. Order on a phone: sticky 64px header (wordmark left; location chip and settings right), a horizontally scrolling row of day tabs with a trailing fade, the verdict panel, the lanes fused beneath it (the lane panel tucks 16px up under the verdict's rounded bottom), then the hour strip (60×100px cells, scroll-snapped, with a trailing fade) and its legend. A thumb dock (Hours · Kit · Log run, 56px targets) pins to the bottom with safe-area padding and a translucent chalk backdrop.

From 1024px the page becomes deliberate two-column: a full-width day ribbon (every hour in one equal-column row, legend right-aligned) sits above a 7:5 grid with a 40px gap. Left: verdict + lanes, then a hairline-topped log row. Right, a compact aside: conditions as a two-column key/value grid, a compact kit list, and run windows. The dock and the in-panel kit row hide. At 1440×900 the ribbon, verdict, lanes and aside fit with little or no scrolling.

Rhythm: 24px between major sections, 16–20px inside sheets, hairline-topped rows with 6–16px vertical padding. Every interactive target is at least 44px.

## Elevation & Depth

Flat by default. The chalk ground, the lanes, the aside and every list are flat and separated by hairlines. Exactly one object is raised in the page: the verdict panel, which casts the raised shadow and sits on a higher z-index so the lanes appear to run out from under it. Sheets, drawers and toasts use the same shadow, because they float above the page by definition. Halo's glass blur and coat gradients are switched off in this world (`--halo-blur: 0px`, coats set to hairline).

### Shadow Vocabulary
- **Raised** (`0 1px 2px rgb(22 24 26 / 0.08), 0 10px 28px -12px rgb(22 24 26 / 0.28)`; night `0 1px 2px rgb(0 0 0 / 0.4), 0 12px 32px -12px rgb(0 0 0 / 0.7)`): the verdict panel, sheets, drawers, toasts.

### Named Rules
**The One Raised Rule.** Only the verdict panel is raised on the page. If something else needs emphasis, give it position or type, not a shadow.

**The Hairline Rule.** Hairlines divide; containers don't nest. There are no cards inside cards: inside a panel or sheet, sections are separated by a 1px hairline top border.

## Shapes

Soft, athletic corners on a small scale: 20px for the two signature panels (the verdict, and the lane panel's bottom corners), 14px for phone hour cells, 12px for inputs and in-panel row hovers, 10px for ribbon cells and hour-table rows, 4px for band swatches. Buttons, tabs, chips and tags are full pills. Lanes are square-ended rows inside their panel, divided by 2px lane paint; the numeral gutter is divided by a 2px vertical paint line. The logo is a track oval (white lane line around an infield-green pill) inside a rubber tile.

Window marks are outlines placed outside the cell, offset 2px onto the page ground so they read on any band: best is a solid 3px ring (2px on the desktop ribbon), good is a 2px dashed outline.

## Components

### Verdict Panel (signature)
The infield. Raised, 20px corners, white text, `data-surface="color"` so focus rings turn white. Contents in order: display headline, effort line (1.125rem/600), a muted conditions line joined with middots, up to two hazard rows (hazard mark + bold title + muted message, each a button that opens the hours sheet), an "N more condition notes" pill, and on phones a hairline-topped "Wear …" kit row. Turns Indoor Slate on a treadmill day. Enters with `verdict-enter` (fade and 6px rise, 320ms).

### Effort Lanes (signature)
The track. A rubber panel fused under the verdict, with a condensed uppercase title, the adjustment line, and an "Edit paces" text button (or a white "Add your paces" pill). Five 52px rows in a `2.75rem | 1fr | auto` grid: numeral gutter, effort name, struck base pace → adjusted pace (condensed 1.3rem) → unit. The selected lane fills Deep Rubber with `aria-pressed`, settling in with `lane-settle` (scaleX from the left with a slight overshoot, 380ms). Other lanes hover to a 10% black wash.

### Buttons
- **Shape:** full pill (9999px); minimum 44px tall (48px for primary).
- **Primary:** ink fill, chalk text, 700 weight, 24px side padding; hover drops to 90% opacity.
- **Secondary:** 1px ink outline that fills with ink on hover (the desktop "Log run").
- **Text:** rubber-coloured label in a 44px pill hit area, worn-chalk hover ("Details", "Why this kit").
- **On colour:** 15% white pills or underlined white text with 10% white hover inside the verdict and lanes.
- **Press:** every button scales to 0.97 on `:active` (120ms); disabled under reduced motion.
- **Focus:** 3px outline in the outline colour (infield by day, signal green by night), 2px offset; white on coloured panels.

### Chips and Tabs
- **Day tabs:** muted text pills; the active day is an ink pill with chalk text and `aria-pressed`.
- **Chips** (log sheet): 1px hairline outline pills; selected chips fill with ink.
- **Segmented control** (settings): a worn-chalk pill track; the selected segment is a raised-chalk pill with a small shadow.
- **Window tags:** "Best" is a solid infield pill with white text; "Good" is an outlined pill.

### Hour Strip and Day Ribbon
Each hour is a band-filled cell with time, a weather glyph, temperature, rain chance (≥30%) and a rank bar along the bottom whose length grows with quality (100% for band 0 down to 20%). The selected hour turns ink with chalk text and drops its rank bar. Best and good windows get the outside-the-cell outlines. Every cell's accessible name carries the band words, condition, rain and window status. The phone strip scrolls; the desktop ribbon shows every hour in one row. A legend (Better ▢▢▢▢▢ Worse · Best window · Also good) sits under the strip and beside the ribbon.

### Hazard Marks
Severity is a shape: an amber diamond with an ink stroke and exclamation for caution and warning, a red octagon with a white stroke and exclamation for danger, and an outlined circle for info. They are always followed by a bold title and a sentence.

### Inputs / Fields
- **Style:** 48px tall, 12px corners, 1px Field Edge border, raised-chalk fill, 16px text (no zoom on iOS).
- **Focus:** border and ring switch to the outline colour; caret in rubber.
- **Error:** a live region under the field in error colour, 600 weight.
- **Switch:** 56×32 pill, Field Edge off, infield on, white knob.

### Sheets and Drawers
halo-ui-react Drawer in the custom world `track`: bottom sheet with snap points, a handle and a recessed page behind it on phones; a right-side drawer on desktop (1024px+). 20px corners, raised-chalk surface, hairline edge, raised shadow, no blur. Header: condensed 1.6rem uppercase title and a 44px round worn-chalk close button. Body padding 20px with safe-area bottom. Toasts use the same world, top-centre, 14px corners. Sheets open the hours table, the full kit, paces, location, settings and the run log.

### Navigation
- **Header:** sticky, 64px, translucent chalk with a light backdrop blur and a hairline bottom border. The wordmark hides visually under 400px, leaving the mark.
- **Location chip:** 44px raised-chalk pill with a hairline border and a rubber pin; an amber dot plus "approx." marks an approximate location.
- **Dock:** three 56px stacked icon-and-label buttons; "Log run" becomes a muted "Logged" with a check once done.

## Do's and Don'ts

### Do:
- **Do** keep the verdict panel as the only raised surface on the page, and fuse the lanes directly beneath it.
- **Do** pair every fill with a checked ink: ≥4.5:1 for all text, ≥5:1 on run bands.
- **Do** double every colour meaning: shape + words for hazards, rank bar + screen-reader words for bands, solid vs dashed outlines (offset onto the page ground) for windows.
- **Do** make every target at least 44px, and give every control a visible 3px `:focus-visible` outline (white on coloured panels).
- **Do** apply fonts with `font-(family-name:--font-display)`; never `font-(--font-display)`, which sets weight in Tailwind v4.
- **Do** use tabular figures for every number, and Barlow Condensed uppercase for headings, numerals and paces.
- **Do** animate only transform and opacity: halo springs for sheets, `lane-settle` and `verdict-enter` for the briefing, a 0.97 press scale for buttons. All of it switches off under `prefers-reduced-motion`.
- **Do** divide with hairlines and open depth in a sheet (bottom sheet on phones, right drawer on desktop).

### Don't:
- **Don't** lead with weather: no giant temperature, no stack of weather cards. The run is the headline.
- **Don't** nest cards inside cards or add shadows to aside sections, lists or hour cells.
- **Don't** carry meaning by colour alone, including hazard levels, hour quality and run windows.
- **Don't** put green on decoration; green is the infield and the answer.
- **Don't** use caution amber or danger red anywhere except hazard marks and errors.
- **Don't** turn on halo's glass blur or coat gradients in this world.
