# Lighthouse Accessibility Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all failing WCAG AA contrast ratios reported by Lighthouse and eliminate the non-standard robots.txt directive.

**Architecture:** Three CSS variable changes fix primary button and muted text contrast across both themes. Four inline HTML class string fixes in app.ts and feedback.ts replace the low-contrast `bg-primary/10 text-primary` active-state pattern with `text-foreground` (dark text on the same tinted background reads at ~15:1). No component API changes; all edits are targeted token or class-string replacements.

**Tech Stack:** Astro, Tailwind CSS v4, CSS custom properties, TypeScript

---

## File Map

| File | What changes |
|---|---|
| `src/styles/starwind.css` | 6 CSS variable values (lines 97–106, 128, 159, 189) |
| `src/lib/app.ts` | 2 class string changes (lines 726, 915) |
| `src/lib/feedback.ts` | 2 class string changes (lines 370, 382) |

---

## Task 1: Update light-mode CSS tokens

**Files:**
- Modify: `src/styles/starwind.css`

- [ ] **Step 1: Open the file and locate the light theme block**

  Find this block (starts around line 88):

  ```css
  :root {
    ...
    --primary: #DC3B2E;
    --primary-foreground: #FFFFFF;
    --primary-accent: #E5544A;
    ...
    --muted-foreground: #71706C;
    ...
    --sidebar-primary: #DC3B2E;
    ...
  }
  ```

- [ ] **Step 2: Update the four light-mode token values**

  Change exactly these four lines inside `:root { ... }`:

  ```css
  --primary: #C8362A;
  --primary-accent: #D6453B;
  --muted-foreground: #5E5D59;
  ```

  And in the sidebar block within `:root`:

  ```css
  --sidebar-primary: #C8362A;
  ```

- [ ] **Step 3: Update the contrast comment block above `:root`**

  Replace the comment that reads:

  ```css
  *   muted-fg   #71706C on #FAFAF8 → 4.8:1 (AA)
  *   primary    #DC3B2E on #FAFAF8 → 4.9:1 (AA)
  ```

  With:

  ```css
  *   muted-fg   #5E5D59 on #F2F1EE (card) → 5.8:1 (AA)  |  on #FAFAF8 → 6.3:1 (AA)
  *   primary    #C8362A, white text → 5.3:1 (AA)
  ```

  > Note: the original comments measured primary/muted as colored *text* on background — that's fine for text usage. The failing use-case was *white text on primary button* and *muted-fg text on card surface*. The new comment reflects both.

- [ ] **Step 4: Verify the new values are present**

  Run: `grep -n "C8362A\|D6453B\|5E5D59" src/styles/starwind.css`

  Expected (4 matches, all in `:root`):
  ```
  97:  --primary: #C8362A;
  99:  --primary-accent: #D6453B;
  106:  --muted-foreground: #5E5D59;
  128:  --sidebar-primary: #C8362A;
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/styles/starwind.css
  git commit -m "fix(a11y): darken light-mode primary and muted-foreground for WCAG AA contrast"
  ```

---

## Task 2: Update dark-mode CSS tokens

**Files:**
- Modify: `src/styles/starwind.css`

- [ ] **Step 1: Locate the dark theme block**

  Find the `.dark { ... }` block. The current dark-mode primary-foreground is:

  ```css
  .dark {
    ...
    --primary: #FF5849;
    --primary-foreground: #FFFFFF;
    ...
    --sidebar-primary: #FF5849;
    --sidebar-primary-foreground: #FFFFFF;
    ...
  }
  ```

- [ ] **Step 2: Change primary-foreground to near-black**

  White on coral `#FF5849` = 3.13:1 (fails). `#111113` on coral = 6.46:1 (passes).

  In `.dark`:

  ```css
  --primary-foreground: #111113;
  ```

  And in the sidebar block within `.dark`:

  ```css
  --sidebar-primary-foreground: #111113;
  ```

  > Dark mode secondary (`#3DDBA9`) and accent (`#FFD166`) already use `#111113` as their foreground — this change makes primary consistent.

- [ ] **Step 3: Update the dark theme contrast comment**

  Replace:
  ```css
  *   primary    #FF5849 on #111113 → 5.8:1 (AA)
  ```
  With:
  ```css
  *   primary    #FF5849 on #111113 → 5.8:1 (AA)  |  #111113 text on #FF5849 → 6.5:1 (AA)
  ```

- [ ] **Step 4: Verify**

  Run: `grep -n "primary-foreground" src/styles/starwind.css`

  Expected:
  ```
  98:  --primary-foreground: #FFFFFF;          ← light mode, unchanged
  129: --sidebar-primary-foreground: #FFFFFF;  ← light sidebar, unchanged
  160: --primary-foreground: #111113;          ← dark mode, changed
  189: --sidebar-primary-foreground: #111113;  ← dark sidebar, changed
  ```

  (Line numbers may differ by ±2 if earlier edits shifted them.)

- [ ] **Step 5: Commit**

  ```bash
  git add src/styles/starwind.css
  git commit -m "fix(a11y): switch dark-mode primary-foreground to near-black for WCAG AA"
  ```

---

## Task 3: Fix effort selector active/disabled states in app.ts

**Files:**
- Modify: `src/lib/app.ts`

- [ ] **Step 1: Find the effort selector button template**

  Search for `select-effort` in `src/lib/app.ts`. You'll find around line 724:

  ```typescript
  return `<button data-action="select-effort" data-effort="${e}"
    class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors
      ${active ? "bg-primary/10 text-primary card-inset" : hasPace ? "text-foreground hover:bg-muted" : "text-muted-foreground/50"}"
  >${EFFORT_LABELS[e]}</button>`;
  ```

- [ ] **Step 2: Fix active state (text-primary → text-foreground) and disabled state (remove /50)**

  Replace the class ternary with:

  ```typescript
  return `<button data-action="select-effort" data-effort="${e}"
    class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors
      ${active ? "bg-primary/10 text-foreground card-inset" : hasPace ? "text-foreground hover:bg-muted" : "text-muted-foreground"}"
  >${EFFORT_LABELS[e]}</button>`;
  ```

  Changes: `text-primary` → `text-foreground` (active), `text-muted-foreground/50` → `text-muted-foreground` (no-pace).

- [ ] **Step 3: Find the effort tag display span**

  Search for `effortTag` in `src/lib/app.ts`. You'll find around line 914:

  ```typescript
  const effortTag = state.selectedEffort !== "easy"
    ? `<span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">${EFFORT_LABELS[state.selectedEffort]}</span>` : "";
  ```

- [ ] **Step 4: Fix the effort tag display span**

  Replace with:

  ```typescript
  const effortTag = state.selectedEffort !== "easy"
    ? `<span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">${EFFORT_LABELS[state.selectedEffort]}</span>` : "";
  ```

  Change: `text-primary` → `text-foreground`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/app.ts
  git commit -m "fix(a11y): replace text-primary on tinted bg with text-foreground in effort badges"
  ```

---

## Task 4: Fix feedback pill active states in feedback.ts

**Files:**
- Modify: `src/lib/feedback.ts`

- [ ] **Step 1: Find the feedback pill function**

  Search for `feedback-select` in `src/lib/feedback.ts`. You'll find around line 366:

  ```typescript
  function pill(group: string, value: string, label: string, selected: string | null): string {
    const active = value === selected;
    return `<button data-action="feedback-select" data-fb-group="${group}" data-fb-value="${value}"
      class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors
        ${active ? "bg-primary/10 text-primary card-inset" : "text-muted-foreground hover:text-foreground hover:bg-muted"}"
    >${label}</button>`;
  }
  ```

- [ ] **Step 2: Fix the pill active state**

  Replace with:

  ```typescript
  function pill(group: string, value: string, label: string, selected: string | null): string {
    const active = value === selected;
    return `<button data-action="feedback-select" data-fb-group="${group}" data-fb-value="${value}"
      class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors
        ${active ? "bg-primary/10 text-foreground card-inset" : "text-muted-foreground hover:text-foreground hover:bg-muted"}"
    >${label}</button>`;
  }
  ```

  Change: `text-primary` → `text-foreground` in active ternary branch.

- [ ] **Step 3: Find the clothing feedback button**

  In the same file, search for `feedback-select" data-fb-group="clothing"`. Around line 380:

  ```typescript
  return `<button data-action="feedback-select" data-fb-group="clothing" data-fb-value="${o.value}"
    class="flex flex-col items-center gap-1.5 rounded-[var(--radius-inner)] p-3 transition-colors
      ${active ? "bg-primary/10 text-primary card-inset" : "card-inset text-muted-foreground hover:text-foreground"}">
  ```

- [ ] **Step 4: Fix the clothing button active state**

  Replace with:

  ```typescript
  return `<button data-action="feedback-select" data-fb-group="clothing" data-fb-value="${o.value}"
    class="flex flex-col items-center gap-1.5 rounded-[var(--radius-inner)] p-3 transition-colors
      ${active ? "bg-primary/10 text-foreground card-inset" : "card-inset text-muted-foreground hover:text-foreground"}">
  ```

  Change: `text-primary` → `text-foreground` in active ternary branch.

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/feedback.ts
  git commit -m "fix(a11y): replace text-primary on tinted bg with text-foreground in feedback pills"
  ```

---

## Task 5: Verify in browser

**Files:** None (manual verification step)

- [ ] **Step 1: Start dev server**

  ```bash
  npm run dev
  ```

  Open `http://localhost:4321` in a browser.

- [ ] **Step 2: Check light mode**

  - Primary buttons (e.g. "Yes" in feedback dialog) should be a slightly deeper red than before, with white text reading cleanly
  - Muted text (subtitles, hints) should be slightly darker and crisper
  - Effort selector: tap any effort level — selected state shows dark text on a light-red tinted background (not red text)
  - No-pace state (before entering paces): effort buttons show solid muted text, not faded

- [ ] **Step 3: Check dark mode**

  - Toggle dark mode
  - Primary buttons should now show near-black text on coral — same as how secondary (mint) and accent (gold) buttons look
  - Muted text unchanged (already passing in dark)

- [ ] **Step 4: Open the feedback flow (3-tap button)**

  - Tap through the feedback flow
  - Selected effort/clothing options should show dark text on light-red bg — not red text

- [ ] **Step 5: Run a Lighthouse accessibility audit**

  In Chrome DevTools → Lighthouse → check Accessibility only → Analyze. Confirm the contrast failures are gone from the report.

---

## Task 6: Fix robots.txt (Cloudflare — no repo change needed)

**Files:** None in repo — action required in Cloudflare dashboard

- [ ] **Step 1: Log in to Cloudflare dashboard**

  Go to your Cloudflare account and navigate to **Pages** → your `runcast` project.

- [ ] **Step 2: Find the custom robots.txt override**

  Check these locations for the `Content-Signal: search=yes,ai-train=no` directive:
  - **Settings → Environment Variables** — look for anything robots-related
  - **Functions** — check `functions/robots.txt.js` or `functions/robots.txt.ts` if they exist
  - **Headers rules** — under Transforms or Page Rules

- [ ] **Step 3: Remove the Content-Signal directive**

  The `Content-Signal` directive is not a valid robots.txt directive — search engines and Lighthouse flag it as unknown. Remove or comment out that line from wherever it's configured.

  If you want to keep AI-crawler opt-outs, use valid user-agent blocks instead:
  ```
  User-agent: GPTBot
  Disallow: /

  User-agent: ChatGPT-User
  Disallow: /

  User-agent: CCBot
  Disallow: /
  ```
  Add these to `public/robots.txt` in the repo and they'll deploy automatically.

- [ ] **Step 4: Redeploy and verify**

  After removing the directive, trigger a new deploy. Then fetch:
  ```
  curl https://runcast.app/robots.txt
  ```
  Confirm the `Content-Signal` line is gone.

---

## Console errors note

The `ERR_BLOCKED_BY_CLIENT` errors for Plausible and Cloudflare Insights are caused by adblocker browser extensions in the browser where Lighthouse was run — not real code errors. No code change needed. Run Lighthouse in an incognito window without extensions to get an accurate Best Practices score.
