# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Runners of every level, training runners first. The primary user runs most days on a plan with distinct efforts (easy, endurance, tempo, threshold, interval). They open Should I Run before a run, on the way out or the night before, to decide when to go, how fast to run given conditions, and what to wear. Casual runners use the same screen for a quick yes, a time, and an outfit, and can ignore the training detail.

## Product Purpose

A daily running briefing. It answers "should I run, and when?" for today and the coming week. For the chosen hour it gives the verdict and run type, the best window, a pace adjusted for conditions, safety warnings, and what to wear. Success means a runner gets that answer in seconds and trusts it enough to act on it.

## Positioning

Clothing apps tell you what to wear; Should I Run tells you how to run today. Its distinguishing mechanisms are condition-adjusted pace (Hadley temp + dew point, plus cold and wind penalties) per effort level; runner-specific safety logic (a 6-scenario ice-risk model, plus NWS/WHO/EPA heat, wind, storm, AQI, and UV thresholds); a best-window scan of the hourly forecast; and daylight math at the runner's pace. Clothing recommendations are table stakes, not the headline.

## Operating Context

- Used mostly on a phone, often standing at the door, sometimes the evening before. It is also installable as a PWA with an offline fallback.
- Location comes from the browser, then IP, then a default (Brooklyn, NY), and can be searched and saved.
- Personal settings live in localStorage: paces per effort, selected effort, runs-hot toggle, °F/°C, mi/km, and theme.
- Optional post-run log ("Did you run today?") records clothing comfort, effort feel, and shoes. It syncs to a Cloudflare Worker backed by D1.
- The app is shown as a live preview inside an iframe on the owner's portfolio hub (hub.akerpelm.workers.dev) via a lightweight `/embed` route.
- It has content pages too: How It Works (FAQ on the formulas), Blog (SEO content), and Privacy.

## Capabilities and Constraints

- Stack: Astro 6 on Cloudflare Workers, Tailwind v4, Starwind UI (vanilla JS), data from the Open-Meteo weather, air-quality, and geocoding APIs. The client renders from template strings; there is no UI framework today. React is allowed only as a lazy island where halo-ui-react (the owner's drawer and toast library) earns it.
- Off-limits in UI work: scoring and run-type logic, the Hadley pace adjustment and other formulas (`src/lib/formulas/`, `src/lib/compute.ts`), the weather and air-quality data layer, the feedback Worker API, and the D1 schema.
- No feature may be removed without the owner's approval.
- Terminology: effort levels Easy, Endurance, Tempo, Threshold, Interval; "run windows" (Best, Good); ice risk levels; "runs hot."

## Brand Commitments

- Name: **Should I Run** (domain shouldirun.today). "RunCast" is the internal repo name only.
- Free, with no subscription, no paywall, and no display ads. Affiliate gear links are deferred, so don't build a "shop picks" UI.
- The visual identity is open for full replacement (logo, colour, type).

## Evidence on Hand

- Formula and threshold documentation: `docs/formulas.md`, `src/pages/about.astro` FAQ.
- Blog posts in `src/content/blog/`.
- No testimonials, user counts, press, or partner logos exist. Do not fabricate any.

## Product Principles

1. Answer first. The verdict and when to run come before any supporting data.
2. Safety is part of the answer, not a banner beside it.
3. Show the reasoning on demand. Every number can be traced to conditions in one tap, never forced on screen.
4. Respect the runner's training. Paces and efforts are first-class, and casual users can skip them without penalty.
5. Never nag. Permission prompts and logging asks happen only at the moment they help.

## Accessibility & Inclusion

WCAG 2.2 AA minimum: full keyboard path, 44px touch targets, prefers-reduced-motion respected, and meaning never carried by colour alone (verdicts and risk levels always have text).
