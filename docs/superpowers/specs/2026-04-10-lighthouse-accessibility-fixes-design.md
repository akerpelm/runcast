# Lighthouse Accessibility & SEO Fixes — Design

**Date:** 2026-04-10
**Status:** Approved

---

## Problem

Lighthouse reports failing contrast, an invalid robots.txt directive, and console errors. The site is being prepared for public launch.

### Failing audit items

| Audit | Issue |
|---|---|
| Accessibility — Contrast | 4 elements failing WCAG AA 4.5:1 for small text |
| SEO — robots.txt | Unknown directive `Content-Signal` on line 29 |
| Best Practices — Console errors | `ERR_BLOCKED_BY_CLIENT` for Plausible and Cloudflare Insights |

---

## Approach C: Full accessibility pass

### 1. CSS variable changes (`src/styles/starwind.css`)

Fix light mode primary and muted-foreground; fix dark mode primary-foreground.

| Token | Current | New | New contrast |
|---|---|---|---|
| `--primary` (light `:root`) | `#DC3B2E` | `#C8362A` | 5.28:1 white text ✓ |
| `--primary-accent` (light `:root`) | `#E5544A` | `#D6453B` | proportionally adjusted |
| `--sidebar-primary` (light `:root`) | `#DC3B2E` | `#C8362A` | matches primary |
| `--muted-foreground` (light `:root`) | `#71706C` | `#5E5D59` | 5.84:1 on card ✓ |
| `--primary-foreground` (dark `.dark`) | `#FFFFFF` | `#111113` | 6.46:1 on coral ✓ |
| `--sidebar-primary-foreground` (dark `.dark`) | `#FFFFFF` | `#111113` | matches primary-foreground |

Update the contrast comments in the CSS to reflect accurate measured values.

### 2. Code changes (`src/lib/app.ts`)

Two fixes to effort badge button class interpolation:

**Active state (text-primary on bg-primary/10 = ~3.49:1):**
```
Before: ${active ? "bg-primary/10 text-primary card-inset" : ...}
After:  ${active ? "bg-primary/10 text-foreground card-inset" : ...}
```
Dark text (#141414) on light pink bg = ~14.9:1 ✓

**No-pace state (text-muted-foreground/50 = ~1.9:1):**
```
Before: ... : "text-muted-foreground/50"}
After:  ... : "text-muted-foreground"}
```
Remove the opacity modifier. Full-opacity `text-muted-foreground` passes at 5.84:1. The "no pace set" disabled appearance is conveyed by context (the pace settings prompt below), not color alone.

### 3. robots.txt

The `public/robots.txt` in the repo is already clean (5 lines, no `Content-Signal`). The production site has extra content injected by Cloudflare Pages (not tracked in the repo). Action: after fixing contrast issues, check the Cloudflare Pages dashboard > Functions or Headers rules for any robots.txt override, and remove the `Content-Signal` directive there.

### 4. Console errors

`ERR_BLOCKED_BY_CLIENT` errors for Plausible analytics and Cloudflare Insights are caused by adblocker browser extensions active during the Lighthouse run — not real code errors. No code change needed. Running Lighthouse in an incognito window without extensions will show the true score.

---

## Files changed

| File | Change |
|---|---|
| `src/styles/starwind.css` | 6 CSS variable value changes + update contrast comments |
| `src/lib/app.ts` | 2 class interpolation changes (effort selector button + effort tag span) |
| `src/lib/feedback.ts` | 2 class interpolation changes (feedback pill + clothing button) |

---

## Non-goals

- No change to dark mode primary color (stays `#FF5849` for vivid text-on-dark legibility)
- No changes to secondary, accent, success, warning, error tokens (not reported failing)
- No Plausible proxy setup (console errors are adblock-only, not a real code issue)
