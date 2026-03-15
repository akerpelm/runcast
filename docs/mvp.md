# RunCast — Technical Specification for Agentic Implementation

---

## Your Role

You are a senior frontend engineer building RunCast, a daily running briefing web application. You will be given two companion documents alongside this spec: a **Business Plan** (product features, monetization, go-to-market) and a **Formulas Reference** (every calculation, threshold, and decision tree the app uses). Those documents are your source of truth for *what* to build and *how the math works*. This document tells you *how to build it* — architecture, stack, patterns, and constraints.

You are not building a prototype. You are building a production-ready, performance-optimized, SEO-friendly web application that will serve real users from day one. Treat every decision accordingly.

---

## Authoritative Documentation

Always consult primary docs before making implementation decisions. Do not rely on memory or cached knowledge — frameworks evolve.

You have access to various
| Concern | Source of Truth |
|---------|----------------|
| Astro framework | https://docs.astro.build/ |
| Astro API reference | https://docs.astro.build/en/reference/configuration-reference/ |
| Tailwind CSS v4 | https://tailwindcss.com/docs |
| Starwind UI components | https://starwind.dev/llms-full.txt |
| Starwind UI theming | https://starwind.dev/docs/getting-started/theming/ |
| Starwind UI installation | https://starwind.dev/docs/getting-started/installation/ |
| Open-Meteo API | https://open-meteo.com/en/docs |
| Open-Meteo Air Quality | https://open-meteo.com/en/docs/air-quality-api |
| Product requirements | `RunReady_Business_Plan_v2.md` (companion doc) |
| Formulas & logic | `RunReady_Formulas_Reference.md` (companion doc) |

**When in doubt, fetch the docs.** Do not guess at Astro APIs, Starwind component props, or Tailwind v4 syntax. The Starwind LLM reference at `https://starwind.dev/llms-full.txt` is specifically designed for your consumption — use it before writing any Starwind component code.

---

## Stack

| Layer | Technology | Version Constraint | Why |
|-------|-----------|-------------------|-----|
| **Framework** | Astro | v5.x | Static-first with islands architecture. Pages are zero-JS by default — only interactive islands ship client JS. Best Lighthouse scores in class. |
| **Styling** | Tailwind CSS | v4.x | Required by Starwind. v4 uses CSS-first config (`@theme` in CSS, no `tailwind.config.js`). |
| **Component Library** | Starwind UI | latest | Astro-native components with ARIA, keyboard nav, and focus management built in. Installed via CLI into `src/components/starwind/`. We own the source. |
| **Interactivity** | Vanilla JS (Astro islands) | — | No React, no Vue. Starwind uses vanilla JS. For weather widget interactivity, use `<script>` tags in Astro components or `client:load` / `client:visible` on island components. |
| **Weather API** | Open-Meteo | free tier | No API key needed. Hourly forecast + historical data + air quality in 2 API calls. |
| **Hosting** | Cloudflare Pages | — | Edge-rendered, free tier, excellent global performance. |
| **Analytics** | Plausible or Umami | — | Privacy-respecting, no cookie banners needed. |
| **Fonts** | Plus Jakarta Sans + DM Sans | Google Fonts | Display + body fonts per design system. Use `display=swap` — never `display=block`. |

### What We Are NOT Using
- **No React / Vue / Svelte** — Starwind is Astro-native + vanilla JS. Adding a framework defeats the zero-JS-by-default benefit.
- **No database at MVP** — Feedback loop (Phase 3) will add Supabase or Turso. Don't scaffold DB code now.
- **No SSR at MVP** — Static site generation (SSG) with client-side API calls for weather data. Evaluate SSR for personalization later.
- **No `tailwind.config.js`** — Tailwind v4 uses CSS-first configuration. All theme tokens live in `src/styles/starwind.css` via `@theme`.

---

## Design System: Neumorphism on Starwind

### The Challenge

Starwind components ship with a default flat/shadcn-style theme using CSS variables. We need to re-skin them to match the Neumorphism design system while **preserving all ARIA attributes, keyboard handling, and focus management** that Starwind provides out of the box.

### The Approach

1. **Override Starwind's CSS variables** in `src/styles/starwind.css` to map to our neumorphic tokens (background, foreground, muted, accent, radius).
2. **Use the Starwind `class` prop** for shadow overrides. Every Starwind component accepts a `class` prop that merges via `tailwind-variants` / `tailwind-merge` — use this to apply neumorphic shadows without touching the component source files.
3. **Only modify Starwind source files** (`src/components/starwind/*.astro`) when the `class` prop can't achieve the effect — e.g., changing internal structure, adding nested shadow elements, or altering hover/active state logic.
4. **Create wrapper components** in `src/components/ui/` that compose Starwind primitives with neumorphic styling, so page-level code stays clean.

### Token Mapping

Override these in `src/styles/starwind.css` within the `@theme` block:

```css
@theme {
  --color-background: #E0E5EC;
  --color-foreground: #3D4852;
  --color-muted: #6B7280;
  --color-accent: #6C63FF;
  --color-accent-light: #8B84FF;
  --color-accent-secondary: #38B2AC;

  /* Neumorphic shadow tokens — reference these in utility classes */
  --shadow-neu-extruded: 9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5);
  --shadow-neu-extruded-hover: 12px 12px 20px rgb(163,177,198,0.7), -12px -12px 20px rgba(255,255,255,0.6);
  --shadow-neu-extruded-sm: 5px 5px 10px rgb(163,177,198,0.6), -5px -5px 10px rgba(255,255,255,0.5);
  --shadow-neu-inset: inset 6px 6px 10px rgb(163,177,198,0.6), inset -6px -6px 10px rgba(255,255,255,0.5);
  --shadow-neu-inset-deep: inset 10px 10px 20px rgb(163,177,198,0.7), inset -10px -10px 20px rgba(255,255,255,0.6);
  --shadow-neu-inset-sm: inset 3px 3px 6px rgb(163,177,198,0.6), inset -3px -3px 6px rgba(255,255,255,0.5);

  --radius-container: 32px;
  --radius-base: 16px;
  --radius-inner: 12px;

  --font-display: 'Plus Jakarta Sans', sans-serif;
  --font-body: 'DM Sans', sans-serif;
}
```

### Starwind Components We Will Use (and How)

| Starwind Component | RunCast Usage | Neumorphic Treatment |
|-------------------|---------------|---------------------|
| `Button` | CTAs, hour selector, feedback buttons | Override via `class` — apply `shadow-[var(--shadow-neu-extruded)]`, swap hover/active shadows |
| `Card` | Weather card, run briefing card, gear rec cards | Override `class` with `rounded-[32px] bg-[#E0E5EC]` + extruded shadow. Nest inset wells for icons. |
| `Input` | Location search, pace input | Override `class` with inset shadow. Focus state → inset-deep + accent ring. |
| `Select` / `Native Select` | Temperature unit picker, preference selects | Inset shadow on trigger, extruded shadow on dropdown panel |
| `Tabs` | Hour selector (alternative to carousel scroll) | Extruded tab bar, inset-deep active tab |
| `Switch` | "Runs hot / Runs cold" toggle | Inset track, extruded thumb |
| `Slider` | Temperature preference calibration | Inset track, extruded handle |
| `Tooltip` | Info icons explaining metrics | Extruded shadow on tooltip panel |
| `Toast` | "Feedback saved" confirmation | Extruded shadow, slides in from bottom |
| `Accordion` | FAQ, "How we calculate this" expandable sections | Extruded container, inset-deep content well when open |
| `Sheet` | Mobile menu, settings panel | Full neumorphic treatment, slides from right |
| `Skeleton` | Loading state while weather API responds | Inset-small shadow pulsing effect |
| `Badge` | AQI indicator, ice risk level, run type tag | Extruded-small shadow, rounded-full |
| `Dialog` | First-time setup (enter base pace, preferences) | Extruded container on overlay backdrop |
| `Spinner` | API loading indicator | Accent color, placed in inset well |

### Components We Build Custom

These don't exist in Starwind and are RunCast-specific:

| Component | Purpose | Notes |
|-----------|---------|-------|
| `HourTimeline` | Horizontal scrollable hour picker (like DressMyRun screenshot) | Custom. Inset track, extruded hour pills, highlighted selected hour. |
| `WeatherBriefing` | The main "today's run" card — pace, conditions, suggestions | Composes Card + multiple Badge + custom layout. The hero component. |
| `ClothingRec` | Single clothing recommendation with affiliate link | Card variant with image, text, and subtle "Shop picks" row below. |
| `BestWindow` | Highlighted optimal running window display | Extruded card with accent border-left glow effect. |
| `IceWarning` | Surface condition alert banner | Inset card with caution icon in deep-inset well. |
| `RunTypeTag` | "Easy day" / "Great for tempo" / "Treadmill" indicator | Badge variant with color coding per run type. |
| `FeedbackWidget` | Post-run 1-tap feedback (Phase 3) | Row of extruded toggle buttons. |

---

## Project Structure

```
src/
├── components/
│   ├── starwind/          # Starwind source (installed via CLI, we own it)
│   │   ├── button/
│   │   ├── card/
│   │   ├── input/
│   │   └── ...
│   ├── ui/                # Our neumorphic wrappers composing Starwind
│   │   ├── NeuButton.astro
│   │   ├── NeuCard.astro
│   │   ├── NeuInput.astro
│   │   └── ...
│   ├── weather/           # RunCast-specific weather components
│   │   ├── HourTimeline.astro
│   │   ├── WeatherBriefing.astro
│   │   ├── BestWindow.astro
│   │   ├── ClothingRec.astro
│   │   ├── IceWarning.astro
│   │   └── RunTypeTag.astro
│   └── layout/            # Page layout components
│       ├── Header.astro
│       ├── Footer.astro
│       └── MobileMenu.astro
├── layouts/
│   └── Layout.astro       # Base HTML shell, imports starwind.css + fonts
├── pages/
│   ├── index.astro        # Main app — the daily briefing
│   ├── about.astro        # What is RunCast, how it works
│   └── blog/              # SEO content (Phase 2)
│       └── [...slug].astro
├── lib/
│   ├── weather.ts         # Open-Meteo API client
│   ├── air-quality.ts     # Open-Meteo AQI client
│   ├── formulas/
│   │   ├── pace.ts        # Heat & cold pace adjustment
│   │   ├── ice-risk.ts    # Surface condition detection
│   │   ├── best-window.ts # Optimal run window scoring
│   │   ├── clothing.ts    # Clothing recommendation logic
│   │   ├── run-type.ts    # Run type suggestion
│   │   ├── daylight.ts    # Sunrise/sunset run math
│   │   └── wind-chill.ts  # NWS wind chill formula
│   └── geo.ts             # Geolocation (browser API + IP fallback)
├── styles/
│   └── starwind.css       # Tailwind v4 theme + Starwind base + neumorphic tokens
└── content/               # Astro content collections (Phase 2 blog)
    └── blog/
```

---

## Data Flow

### On Page Load

```
1. Browser geolocation API (or IP fallback) → lat/lng
2. Client-side fetch to Open-Meteo:
   - GET /v1/forecast?lat=X&lng=Y&hourly=temperature_2m,dew_point_2m,...&past_days=1&forecast_days=7
   - GET /v1/air-quality?lat=X&lng=Y&hourly=us_aqi,pm2_5,pm10
3. Response → lib/formulas/* → computed RunCast data:
   - Pace adjustment (heat or cold, depending on season)
   - Ice risk assessment
   - Best running window
   - Clothing recommendations
   - Run type suggestion
   - Daylight/sunset math
   - AQI status
4. Computed data → reactive UI update (vanilla JS in Astro island)
```

### Why Client-Side, Not SSR?

- Weather is user-location-dependent — we need browser geolocation.
- Open-Meteo is free and fast (no API key, no CORS issues, <200ms responses).
- Static page shell loads instantly (Astro SSG), then hydrates with weather data.
- This gives us the best Lighthouse score: fast static HTML + progressive enhancement with data.

### API Call Shape

Single weather call (see Formulas Reference for full parameter list):

```
https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lng}
  &hourly=temperature_2m,relative_humidity_2m,dew_point_2m,
          apparent_temperature,precipitation_probability,
          precipitation,rain,snowfall,cloud_cover,
          wind_speed_10m,wind_gusts_10m,wind_direction_10m,
          uv_index,visibility
  &daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,
         precipitation_sum,wind_speed_10m_max
  &current=temperature_2m,relative_humidity_2m,wind_speed_10m,
           precipitation,cloud_cover
  &temperature_unit=fahrenheit
  &wind_speed_unit=mph
  &precipitation_unit=inch
  &timezone=auto
  &past_days=1
  &forecast_days=7
```

---

## Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| Lighthouse Performance | 95+ | Astro SSG, zero JS by default, deferred island hydration |
| First Contentful Paint | < 1.0s | Static HTML shell with skeleton loading states |
| Largest Contentful Paint | < 1.5s | No hero images, neumorphic shadows are CSS-only |
| Cumulative Layout Shift | < 0.05 | Fixed-height skeleton placeholders match final layout |
| Total JS shipped | < 30KB gzip | Vanilla JS only. No framework runtime. Weather logic is small. |
| API response display | < 500ms after geolocation | Open-Meteo is fast. Parallel fetch weather + AQI. |

### Performance Rules

- **No `client:load` unless required.** Default Astro components are zero-JS. Only the weather island needs hydration.
- **Use `client:visible`** for below-fold content (clothing recs, 7-day outlook) — don't hydrate until scrolled into view.
- **Preload fonts** with `<link rel="preload">` for Plus Jakarta Sans and DM Sans. Subset to latin if possible.
- **Inline critical CSS.** Astro handles this with its built-in CSS optimization — don't fight it.
- **No external JS dependencies** beyond what Starwind requires (`tailwind-variants`, `tailwind-merge`). These are build-time only and don't ship to the client.
- **Parallel API calls.** `Promise.all([fetchWeather(), fetchAirQuality()])` — never sequential.

---

## Accessibility Requirements

Starwind handles most of this — your job is to not break it.

- **Every interactive element must have a visible focus indicator.** Neumorphic focus state: `ring-2 ring-[#6C63FF] ring-offset-2 ring-offset-[#E0E5EC]`.
- **Touch targets ≥ 44×44px** on mobile. Hour selector pills, feedback buttons, navigation links.
- **Semantic HTML.** Use `<main>`, `<nav>`, `<section>`, `<article>`. Don't `<div>` everything.
- **Alt text** on all clothing recommendation images.
- **ARIA live regions** for dynamically loaded weather data — `aria-live="polite"` on the weather briefing container so screen readers announce when data loads.
- **Color is never the only indicator.** AQI green/yellow/red must also include text labels ("Good", "Moderate", "Unhealthy").
- **Reduced motion.** Wrap floating animations in `@media (prefers-reduced-motion: no-preference)`. Respect user settings.

---

## SEO

- **`<title>` and `<meta description>`** on every page. Index page: "RunCast — Your daily running briefing. Weather, pace adjustment, and gear for today's run."
- **Open Graph tags** for social sharing.
- **Canonical URLs.**
- **Structured data** (JSON-LD) for the main app as a `WebApplication` schema.
- **Blog content** (Phase 2) uses Astro Content Collections with proper heading hierarchy, internal links, and keyword targeting: "what to wear running in [temp]", "running pace adjustment heat", "is it too hot to run today".
- **Sitemap** via `@astrojs/sitemap`.

---

## Phased Build Plan

### Phase 1: MVP (This Build)

Build the core daily briefing page with all free-tier features:

1. **Project scaffolding** — Astro v5 + Starwind init + neumorphic theme tokens
2. **Layout** — Header (sticky, with location display), main content, footer
3. **Geolocation** — Browser API with IP fallback, location name resolution
4. **Weather data layer** — Open-Meteo client, parallel API calls, type-safe response parsing
5. **Formula engine** — All calculations from the Formulas Reference implemented in `lib/formulas/`
6. **Hour timeline** — Horizontal scrollable selector showing temp, conditions, UV per hour
7. **Weather briefing card** — The hero: current conditions + pace adjustment + run type suggestion
8. **Best window** — Highlighted optimal time with reasoning
9. **Ice / surface warnings** — Conditional banner when ice risk > NONE
10. **Clothing recommendations** — Temperature-based gear recs (no affiliate links yet — Phase 2)
11. **AQI indicator** — Badge with color + text label
12. **Sunrise/sunset math** — Daylight remaining at adjusted pace
13. **Mobile responsive** — Full neumorphic treatment on all breakpoints
14. **Skeleton loading** — Neumorphic inset-shimmer skeletons while API loads

### Phase 2: Monetization Layer

- Affiliate links under clothing recs (Amazon Associates, Brooks via Impact, etc.)
- SEO blog with Astro Content Collections
- OG images for social sharing

### Phase 3: Feedback Loop + PWA

- Post-run feedback widget (1-tap: too hot / just right / too cold)
- Supabase backend for storing feedback
- Service worker + push notifications
- Home screen install prompt

---

## Key Architectural Decisions (and Why)

**Why Astro over Next.js?**
Zero JS by default. A weather briefing page is mostly static content with one interactive widget. Astro ships no framework runtime. Next.js would ship ~80KB+ of React just to render text.

**Why Starwind over building from scratch?**
ARIA, keyboard navigation, and focus management are hard to get right. Starwind gives us 45+ accessible components with proper semantics. We restyle the visuals; we don't rebuild the interaction layer.

**Why neumorphism?**
Brand differentiation. Every running app looks the same (flat, white, accent-colored cards). Neumorphism is distinctive, memorable, and — when done with proper contrast — just as readable. It also photographs well for social sharing and Reddit launch posts.

**Why no dark mode at MVP?**
Neumorphism relies on a specific light-source relationship with a monochromatic background. Dark mode neumorphism is a different design problem (light shadows become dark glows, the physics invert). It's achievable but doubles the design work. Add it post-launch based on user demand.

**Why Tailwind v4 CSS-first config?**
Because Starwind requires it. Also: CSS custom properties are faster than JS-based theme switching, tree-shake better, and are the direction Tailwind is headed. No `tailwind.config.js` — everything is in CSS.

---

## Final Notes for the Builder

- **Don't overengineer.** This is a single-page weather app with a blog. Keep it simple. Astro's file-based routing and component model are already the right abstraction level.
- **Ship the formulas exactly as specified.** The Formulas Reference has tested, cited, well-sourced calculations. Implement them faithfully. Don't simplify or "improve" the math without a good reason.
- **The hour timeline is the UX centerpiece.** Look at the DressMyRun screenshot in the business plan. Ours needs to be at least as good, with more data per hour (temp + conditions icon + UV + AQI dot).
- **Affiliate links are `rel="noopener noreferrer sponsored"`.** Always. FTC requires disclosure.
- **Test with real Brooklyn weather.** The target user runs in NYC. Use lat=40.69, lng=-73.99 for development.
- **The neumorphic shadows are the brand.** Get them right. They should feel tactile, physical, like pressing buttons on a high-end piece of matte hardware. If the shadows look flat, muddy, or harsh, the whole product fails aesthetically.