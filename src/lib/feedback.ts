/**
 * Feedback module — extracted from app.ts.
 * 3-tap inline feedback flow: clothing feel + effort level + shoes (optional).
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export interface FeedbackEntry {
  id: string;
  anonId: string;
  timestamp: string;
  date: string;
  location: string;
  lat: number | null;
  lng: number | null;
  synced: boolean;
  weather: {
    hour: number;
    tempF: number;
    feelsLikeF: number;
    dewPointF: number;
    humidity: number;
    windMph: number;
    gustsMph: number;
    precipProb: number;
    precipIn: number;
    cloudCover: number;
    uvIndex: number;
    weatherCode: number;
    visibility: number;
    sunrise: string;
    sunset: string;
  };
  aqiForHour: number | null;
  recommended: {
    runType: string;
    clothingTop: string;
    clothingBottom: string;
    accessories: string[];
    paceAdjustMin: number;
    paceAdjustMax: number;
    paceAdjustType: string;
    bestWindowStart: string;
    bestWindowEnd: string;
    iceRisk: string;
  };
  prefs: {
    effort: string;
    runsHot: boolean;
    basePace: number;
  };
  clothingFeel: string | null;
  effortLevel: string | null;
  shoes: string | null;
}

export interface FeedbackState {
  feedbackClothing: string | null;
  feedbackEffortLevel: string | null;
  feedbackShoes: string | null;
  feedbackShoesOther: boolean; // text input revealed via "Other..." pill
  feedbackOpen: boolean;
  feedbackSubmitted: boolean;
}

/** Minimal briefing data needed by feedback to save entries */
export interface FeedbackBriefing {
  hour: {
    time: string;
    temperature: number;
    apparentTemperature: number;
    dewPoint: number;
    humidity: number;
    windSpeed: number;
    windGusts: number;
    precipProbability: number;
    precipitation: number;
    cloudCover: number;
    uvIndex: number;
    weatherCode: number;
    visibility: number;
  };
  aqiForHour: number | undefined;
  runType: { type: string };
  clothing: { top: string; bottom: string; accessories: string[] };
  paceAdjustment: { min: number; max: number; type: string };
  iceRisk: { risk: string };
}

/** Context from app state needed to save a feedback entry */
export interface FeedbackContext {
  locationName: string;
  lat: number | null;
  lng: number | null;
  selectedEffort: string;
  runsHot: boolean;
  basePace: number;
  bestWindowStart: string;
  bestWindowEnd: string;
  sunrise: string;
  sunset: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
export const LS_FEEDBACK = "runcast-feedback";
export const LS_FEEDBACK_DISMISSED = "runcast-feedback-dismissed";
export const LS_ANON_ID = "runcast-anon-id";
export const LS_SHOES = "runcast-shoes";

// ─── Shoe History ────────────────────────────────────────────────────────────
interface ShoeEntry { name: string; lastUsed: string }

export function getShoeHistory(): ShoeEntry[] {
  try {
    const raw = localStorage.getItem(LS_SHOES);
    if (!raw) return [];
    const shoes = JSON.parse(raw) as ShoeEntry[];
    return shoes.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed)).slice(0, 6);
  } catch { return []; }
}

export function saveShoeToHistory(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  let shoes: ShoeEntry[] = [];
  try {
    const raw = localStorage.getItem(LS_SHOES);
    if (raw) shoes = JSON.parse(raw);
  } catch { /* ignore */ }
  const existing = shoes.findIndex(s => s.name.toLowerCase() === trimmed.toLowerCase());
  if (existing >= 0) {
    shoes[existing].lastUsed = new Date().toISOString();
    shoes[existing].name = trimmed; // keep latest casing
  } else {
    shoes.push({ name: trimmed, lastUsed: new Date().toISOString() });
  }
  localStorage.setItem(LS_SHOES, JSON.stringify(shoes));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esc(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ─── Anonymous Profile ───────────────────────────────────────────────────────
export function getAnonId(): string {
  let id = localStorage.getItem(LS_ANON_ID);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(LS_ANON_ID, id);
  }
  return id;
}

export function getFeedbackCount(): number {
  try {
    const raw = localStorage.getItem(LS_FEEDBACK);
    if (!raw) return 0;
    return (JSON.parse(raw) as unknown[]).length;
  } catch { return 0; }
}

export function getPersonalInsight(): string | null {
  try {
    const raw = localStorage.getItem(LS_FEEDBACK);
    if (!raw) return null;
    const entries = JSON.parse(raw) as { clothingFeel?: string; effortLevel?: string; shoes?: string; date?: string }[];
    if (entries.length < 3) return null;

    // Warm/cold tendency (5+ entries)
    if (entries.length >= 5) {
      const tooWarm = entries.filter(e => e.clothingFeel === "too-warm").length;
      const tooCold = entries.filter(e => e.clothingFeel === "too-cold").length;
      const ratio = entries.length;
      if (tooWarm / ratio >= 0.4) return "You tend to run warm — your clothing recs are calibrating warmer.";
      if (tooCold / ratio >= 0.4) return "You tend to run cold — your clothing recs are calibrating cooler.";
    }

    // Most-used shoe (3+ entries with shoes)
    const withShoes = entries.filter(e => e.shoes);
    if (withShoes.length >= 3) {
      const shoeCounts: Record<string, number> = {};
      for (const e of withShoes) {
        const s = e.shoes!.toLowerCase();
        shoeCounts[s] = (shoeCounts[s] || 0) + 1;
      }
      const top = Object.entries(shoeCounts).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 2) return `Most-used shoe: ${withShoes.find(e => e.shoes!.toLowerCase() === top[0])!.shoes} (${top[1]} runs).`;
    }

    // Effort distribution (10+ entries)
    if (entries.length >= 10) {
      const effortCounts: Record<string, number> = {};
      for (const e of entries) {
        if (e.effortLevel) effortCounts[e.effortLevel] = (effortCounts[e.effortLevel] || 0) + 1;
      }
      const topEffort = Object.entries(effortCounts).sort((a, b) => b[1] - a[1])[0];
      if (topEffort) {
        const pct = Math.round((topEffort[1] / entries.length) * 100);
        if (pct >= 40) return `${pct}% of your runs are ${topEffort[0]} effort.`;
      }
    }

    // Seasonal context — runs this month
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const thisMonthCount = entries.filter(e => e.date?.startsWith(monthStr)).length;
    if (thisMonthCount >= 2) return `You've logged ${thisMonthCount} runs in ${monthNames[now.getMonth()]}.`;

    if (entries.length >= 10) return `${entries.length} runs logged. Your recommendations are personalized.`;
    return null;
  } catch { return null; }
}

// ─── Day checks ──────────────────────────────────────────────────────────────
export function hasFeedbackToday(): boolean {
  try {
    const raw = localStorage.getItem(LS_FEEDBACK);
    if (!raw) return false;
    const entries = JSON.parse(raw) as { date: string }[];
    const today = localDateStr(new Date());
    return entries.some(e => e.date === today);
  } catch { return false; }
}

export function isFeedbackDismissedToday(): boolean {
  return localStorage.getItem(LS_FEEDBACK_DISMISSED) === localDateStr(new Date());
}

export function dismissFeedback(state: FeedbackState, renderCallback: () => void): void {
  localStorage.setItem(LS_FEEDBACK_DISMISSED, localDateStr(new Date()));
  state.feedbackSubmitted = true;
  renderCallback();
}

// ─── Save ────────────────────────────────────────────────────────────────────
export function saveFeedback(b: FeedbackBriefing, ctx: FeedbackContext, state: FeedbackState): void {
  const h = b.hour;

  const entry: FeedbackEntry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    anonId: getAnonId(),
    timestamp: new Date().toISOString(),
    date: localDateStr(new Date()),
    location: ctx.locationName,
    lat: ctx.lat != null ? Math.round(ctx.lat * 100) / 100 : null,
    lng: ctx.lng != null ? Math.round(ctx.lng * 100) / 100 : null,
    synced: false,
    weather: {
      hour: new Date(h.time).getHours(),
      tempF: Math.round(h.temperature),
      feelsLikeF: Math.round(h.apparentTemperature),
      dewPointF: Math.round(h.dewPoint),
      humidity: Math.round(h.humidity),
      windMph: Math.round(h.windSpeed),
      gustsMph: Math.round(h.windGusts),
      precipProb: h.precipProbability,
      precipIn: h.precipitation,
      cloudCover: h.cloudCover,
      uvIndex: h.uvIndex,
      weatherCode: h.weatherCode,
      visibility: h.visibility,
      sunrise: ctx.sunrise,
      sunset: ctx.sunset,
    },
    aqiForHour: b.aqiForHour ?? null,
    recommended: {
      runType: b.runType.type,
      clothingTop: b.clothing.top,
      clothingBottom: b.clothing.bottom,
      accessories: b.clothing.accessories,
      paceAdjustMin: b.paceAdjustment.min,
      paceAdjustMax: b.paceAdjustment.max,
      paceAdjustType: b.paceAdjustment.type,
      bestWindowStart: ctx.bestWindowStart,
      bestWindowEnd: ctx.bestWindowEnd,
      iceRisk: b.iceRisk.risk,
    },
    prefs: {
      effort: ctx.selectedEffort,
      runsHot: ctx.runsHot,
      basePace: ctx.basePace,
    },
    clothingFeel: state.feedbackClothing,
    effortLevel: state.feedbackEffortLevel,
    shoes: state.feedbackShoes || null,
  };

  // Persist shoe to history if provided
  if (state.feedbackShoes) {
    saveShoeToHistory(state.feedbackShoes);
  }

  let entries: unknown[] = [];
  try {
    const raw = localStorage.getItem(LS_FEEDBACK);
    if (raw) entries = JSON.parse(raw);
  } catch { /* ignore */ }

  entries.push(entry);
  localStorage.setItem(LS_FEEDBACK, JSON.stringify(entries));

  // Notify header button
  window.dispatchEvent(new CustomEvent("runcast:feedback-submitted"));
}

// ─── Submit ──────────────────────────────────────────────────────────────────
export function submitFeedback(
  state: FeedbackState,
  getBriefing: () => FeedbackBriefing | null,
  getContext: () => FeedbackContext,
  renderCallback: () => void,
): void {
  const b = getBriefing();
  if (b) {
    saveFeedback(b, getContext(), state);
    state.feedbackSubmitted = true;
    renderCallback();
  }
}

// ─── Render ──────────────────────────────────────────────────────────────────
export function renderFeedback(_b: FeedbackBriefing, state: FeedbackState): string {
  if (state.feedbackSubmitted || isFeedbackDismissedToday()) {
    if (state.feedbackSubmitted && hasFeedbackToday()) {
      const count = getFeedbackCount();
      const insight = getPersonalInsight();
      const insightStr = insight ? ` \u00b7 ${esc(insight)}` : "";
      const countStr = count > 1 ? `${count} runs tracked` : "";
      return `
        <div id="feedback-section" class="mb-3 flex items-center gap-2 rounded-[var(--radius-base)] bg-success/5 px-3 py-2">
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 text-success-foreground shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          <p class="text-xs text-muted-foreground">Logged, see you tomorrow${countStr ? ` \u00b7 ${countStr}` : ""}${insightStr}</p>
        </div>`;
    }
    return '<div id="feedback-section"></div>';
  }

  if (state.feedbackOpen) {
    // Determine which step we're on
    const step = !state.feedbackClothing ? 1 : !state.feedbackEffortLevel ? 2 : 3;

    const clothingIcons: Record<string, string> = {
      "too-cold": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M2 12h10"/><path d="M9 4v16"/><path d="m3 9 3 3-3 3"/><path d="M12 6 9.7 3.7a1 1 0 0 1 0-1.4l.6-.6a1 1 0 0 1 1.4 0L15 5"/><path d="m20 4-8.5 8.5"/><path d="M12 18l3.3 3.3a1 1 0 0 0 1.4 0l.6-.6a1 1 0 0 0 0-1.4L14 16"/></svg>`,
      "just-right": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M20 6 9 17l-5-5"/></svg>`,
      "too-warm": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
    };
    const clothingOptions = [
      { value: "too-cold", label: "Too Cold" },
      { value: "just-right", label: "Just Right" },
      { value: "too-warm", label: "Too Warm" },
    ];
    const effortPills = [
      { value: "easy", label: "Easy" },
      { value: "moderate", label: "Moderate" },
      { value: "hard", label: "Hard" },
      { value: "race", label: "Race" },
    ];

    function pill(group: string, value: string, label: string, selected: string | null): string {
      const active = value === selected;
      return `<button data-action="feedback-select" data-fb-group="${group}" data-fb-value="${value}"
        class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors
          ${active ? "bg-primary/10 text-foreground card-inset" : "text-muted-foreground hover:text-foreground hover:bg-muted"}"
      >${label}</button>`;
    }

    // Step 1: Clothing feel — large tappable cards with icons
    let step1HTML = `<div>
      <p class="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">1. How did the clothing feel?</p>
      <div class="grid grid-cols-3 gap-2">
        ${clothingOptions.map(o => {
          const active = o.value === state.feedbackClothing;
          return `<button data-action="feedback-select" data-fb-group="clothing" data-fb-value="${o.value}"
            class="flex flex-col items-center gap-1.5 rounded-[var(--radius-inner)] p-3 transition-colors
              ${active ? "bg-primary/10 text-foreground card-inset" : "card-inset text-muted-foreground hover:text-foreground"}">
            ${clothingIcons[o.value]}
            <span class="text-xs font-semibold">${o.label}</span>
          </button>`;
        }).join("")}
      </div>
    </div>`;

    // Step 2: Effort level
    let step2HTML = "";
    if (step >= 2) {
      step2HTML = `<div>
        <p class="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">2. Effort level?</p>
        <div class="flex flex-wrap gap-1.5">${effortPills.map(p => pill("effortLevel", p.value, p.label, state.feedbackEffortLevel)).join("")}</div>
      </div>`;
    }

    // Step 3: Shoes
    let step3HTML = "";
    if (step >= 3) {
      const shoeHistory = getShoeHistory();
      if (shoeHistory.length > 0 && !state.feedbackShoesOther) {
        const shoePills = shoeHistory.slice(0, 5).map(s =>
          pill("shoes", s.name, s.name, state.feedbackShoes)
        ).join("");
        const otherPill = `<button data-action="feedback-shoe-other"
          class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
        >Other...</button>`;
        step3HTML = `<div>
          <p class="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">3. Shoes <span class="font-normal">(optional)</span></p>
          <div class="flex flex-wrap gap-1.5">${shoePills}${otherPill}</div>
        </div>`;
      } else {
        const val = state.feedbackShoes ? esc(state.feedbackShoes) : "";
        step3HTML = `<div>
          <p class="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">3. Shoes <span class="font-normal">(optional)</span></p>
          <input data-action="feedback-shoe-text" type="text" placeholder="What shoes?" value="${val}"
            class="h-7 w-full max-w-[200px] rounded-[var(--radius-inner)] card-inset px-2 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>`;
      }
    }

    return `
      <div id="feedback-section" class="mb-4 rounded-[var(--radius-base)] card-surface-raised accent-stripe px-4 py-3">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold text-foreground">How was the run?</p>
            <span class="text-xs text-muted-foreground">${step} of 3</span>
          </div>
          <button data-action="dismiss-feedback" class="text-xs text-muted-foreground hover:text-foreground transition-colors">Skip</button>
        </div>
        <div class="space-y-3">
          ${step1HTML}
          ${step2HTML}
          ${step3HTML}
        </div>
        ${state.feedbackClothing && state.feedbackEffortLevel ? `
        <div class="mt-3 flex items-center justify-end">
          <button data-action="feedback-submit"
            class="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >Log it</button>
        </div>` : ""}
      </div>`;
  }

  return `
    <div id="feedback-section" class="mb-4 flex items-center gap-3 rounded-[var(--radius-base)] card-surface-raised accent-stripe px-4 py-3">
      <div class="flex-1">
        <p class="text-sm font-semibold text-foreground">Did you run today?</p>
        <p class="text-xs text-muted-foreground">Quick log — improves your recs and keeps RunCast free.</p>
      </div>
      <button data-action="open-feedback"
        class="shrink-0 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
      >Yes</button>
      <button data-action="dismiss-feedback"
        class="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >No</button>
    </div>`;
}

// ─── Event handling ──────────────────────────────────────────────────────────
export function handleFeedbackAction(
  action: string,
  target: HTMLElement,
  state: FeedbackState,
  getBriefing: () => FeedbackBriefing | null,
  getContext: () => FeedbackContext,
  renderCallback: () => void,
): boolean {
  switch (action) {
    case "open-feedback":
      state.feedbackOpen = true;
      renderCallback();
      return true;
    case "dismiss-feedback":
      dismissFeedback(state, renderCallback);
      return true;
    case "feedback-select": {
      const group = target.dataset.fbGroup;
      const value = target.dataset.fbValue || "";
      if (group === "clothing") {
        state.feedbackClothing = state.feedbackClothing === value ? null : value;
      } else if (group === "effortLevel") {
        state.feedbackEffortLevel = state.feedbackEffortLevel === value ? null : value;
      } else if (group === "shoes") {
        state.feedbackShoes = state.feedbackShoes === value ? null : value;
      }
      renderCallback();
      return true;
    }
    case "feedback-submit":
      submitFeedback(state, getBriefing, getContext, renderCallback);
      return true;
    case "feedback-shoe-other":
      state.feedbackShoesOther = true;
      state.feedbackShoes = null;
      renderCallback();
      return true;
    default:
      return false;
  }
}
