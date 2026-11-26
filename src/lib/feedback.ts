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
  wornTop: string | null;
  wornBottom: string | null;
}

export interface FeedbackState {
  feedbackWornTop: string | null;
  feedbackWornBottom: string | null;
  feedbackWornConfirmed: boolean; // user confirmed or changed what they wore
  feedbackWornEditing: boolean;   // user clicked "Change" to pick different clothing
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
    wornTop: state.feedbackWornTop || null,
    wornBottom: state.feedbackWornBottom || null,
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

// ─── Clothing tier options for the "what did you wear?" picker ──────────────
const TOP_OPTIONS = [
  "Singlet or sports bra",
  "T-shirt or singlet",
  "T-shirt or light long sleeve",
  "Long-sleeve tech tee",
  "Long-sleeve base layer + half-zip or vest",
  "Base layer + midweight jacket",
  "Thermal base layer + insulated jacket",
  "Base + mid + wind shell",
];

const BOTTOM_OPTIONS = [
  "Split shorts",
  "Shorts",
  "Shorts or half tights",
  "Running tights",
  "Insulated tights",
  "Insulated tights + wind pants",
];

// ─── Render ──────────────────────────────────────────────────────────────────
const chip = "press inline-flex min-h-11 items-center rounded-full border px-4 text-[0.95rem] font-semibold";
const chipOn = "border-foreground bg-foreground text-background";
const chipOff = "border-hair text-foreground hover:bg-muted";
const stepTitle = "font-(family-name:--font-body) text-base font-bold";
const primaryBtn = "press inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 text-base font-bold text-background hover:opacity-90";

/** Body of the "Log run" sheet. Shows the confirmation once today's run is logged. */
export function renderFeedback(b: FeedbackBriefing, state: FeedbackState): string {
  if (state.feedbackSubmitted && hasFeedbackToday()) {
    const count = getFeedbackCount();
    const insight = getPersonalInsight();
    return `<div id="feedback-section" class="py-2">
      <p class="text-lg font-bold">Logged. See you tomorrow.</p>
      <p class="mt-1 text-[0.95rem] text-muted-foreground">${count > 1 ? `${count} runs tracked on this device.` : "Your first run is tracked."}${insight ? ` ${esc(insight)}` : ""}</p>
    </div>`;
  }

  // Pre-fill worn clothing from recommendation if not yet set
  if (state.feedbackWornTop === null) state.feedbackWornTop = b.clothing.top;
  if (state.feedbackWornBottom === null) state.feedbackWornBottom = b.clothing.bottom;

  // Steps: 1=what did you wear, 2=clothing feel, 3=effort, 4=shoes
  const step = !state.feedbackWornConfirmed ? 1
    : !state.feedbackClothing ? 2
    : !state.feedbackEffortLevel ? 3
    : 4;

  const clothingOptions = [
    { value: "too-cold", label: "Too cold" },
    { value: "just-right", label: "Just right" },
    { value: "too-warm", label: "Too warm" },
  ];
  const effortPills = [
    { value: "easy", label: "Easy" },
    { value: "moderate", label: "Moderate" },
    { value: "hard", label: "Hard" },
    { value: "race", label: "Race" },
  ];

  function pill(group: string, value: string, label: string, selected: string | null): string {
    const active = value === selected;
    return `<button type="button" data-action="feedback-select" data-fb-group="${group}" data-fb-value="${esc(value)}" aria-pressed="${active}"
      class="${chip} ${active ? chipOn : chipOff}">${esc(label)}</button>`;
  }

  let step1HTML: string;
  if (!state.feedbackWornEditing) {
    const matchesRec = state.feedbackWornTop === b.clothing.top && state.feedbackWornBottom === b.clothing.bottom;
    step1HTML = `<section>
      <h3 class="${stepTitle}">What did you wear?</h3>
      <dl class="mt-2 rounded-[14px] bg-muted px-4 py-3 text-[0.95rem]">
        <dt class="text-sm text-muted-foreground">Top</dt><dd class="font-semibold">${esc(state.feedbackWornTop ?? "")}</dd>
        <dt class="mt-2 text-sm text-muted-foreground">Bottom</dt><dd class="font-semibold">${esc(state.feedbackWornBottom ?? "")}</dd>
      </dl>
      <p class="mt-2 text-sm text-muted-foreground">${matchesRec ? "Matches today's pick." : "Different from today's pick. That helps tune it."}</p>
      <div class="mt-3 flex gap-2">
        ${state.feedbackWornConfirmed ? "" : `<button type="button" data-action="feedback-worn-confirm" class="${primaryBtn}">Wore this</button>`}
        <button type="button" data-action="feedback-worn-edit" class="${chip} ${chipOff}">Change</button>
      </div>
    </section>`;
  } else {
    step1HTML = `<section>
      <h3 class="${stepTitle}">What did you actually wear?</h3>
      <p class="mt-3 text-sm font-semibold text-muted-foreground">Top</p>
      <div class="mt-1 flex flex-wrap gap-2">${TOP_OPTIONS.map(t => pill("wornTop", t, t, state.feedbackWornTop)).join("")}</div>
      <p class="mt-3 text-sm font-semibold text-muted-foreground">Bottom</p>
      <div class="mt-1 flex flex-wrap gap-2">${BOTTOM_OPTIONS.map(t => pill("wornBottom", t, t, state.feedbackWornBottom)).join("")}</div>
      <button type="button" data-action="feedback-worn-confirm" class="${primaryBtn} mt-4">Done</button>
    </section>`;
  }

  const step2HTML = step >= 2 ? `<section class="border-t border-hair pt-4">
      <h3 class="${stepTitle}">How did the clothing feel?</h3>
      <div class="mt-2 flex flex-wrap gap-2">${clothingOptions.map(o => pill("clothing", o.value, o.label, state.feedbackClothing)).join("")}</div>
    </section>` : "";

  const step3HTML = step >= 3 ? `<section class="border-t border-hair pt-4">
      <h3 class="${stepTitle}">How hard was it?</h3>
      <div class="mt-2 flex flex-wrap gap-2">${effortPills.map(p => pill("effortLevel", p.value, p.label, state.feedbackEffortLevel)).join("")}</div>
    </section>` : "";

  let step4HTML = "";
  if (step >= 4) {
    const shoeHistory = getShoeHistory();
    const body = shoeHistory.length > 0 && !state.feedbackShoesOther
      ? `<div class="mt-2 flex flex-wrap gap-2">${shoeHistory.slice(0, 5).map(sh => pill("shoes", sh.name, sh.name, state.feedbackShoes)).join("")}
          <button type="button" data-action="feedback-shoe-other" class="${chip} ${chipOff}">Other shoe</button></div>`
      : `<label for="fb-shoe" class="sr-only">Shoe name</label><input id="fb-shoe" data-action="feedback-shoe-text" type="text" placeholder="e.g. Pegasus 41" value="${state.feedbackShoes ? esc(state.feedbackShoes) : ""}"
          class="mt-2 h-12 w-full rounded-[12px] border border-input bg-card px-3 text-base" />`;
    step4HTML = `<section class="border-t border-hair pt-4">
      <h3 class="${stepTitle}">Shoes <span class="text-sm font-normal text-muted-foreground">optional</span></h3>${body}
    </section>`;
  }

  const ready = state.feedbackWornConfirmed && state.feedbackClothing && state.feedbackEffortLevel;
  return `<div id="feedback-section">
    <p class="mb-4 text-sm font-semibold text-muted-foreground">Step ${step} of 4</p>
    <div class="space-y-4">${step1HTML}${step2HTML}${step3HTML}${step4HTML}</div>
    <div class="mt-6 flex items-center justify-between gap-3 border-t border-hair pt-4">
      <button type="button" data-action="dismiss-feedback" class="press min-h-11 rounded-full px-3 text-[0.95rem] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Not today</button>
      ${ready ? `<button type="button" data-action="feedback-submit" class="${primaryBtn}">Log it</button>` : ""}
    </div>
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
    case "feedback-worn-confirm":
      state.feedbackWornConfirmed = true;
      state.feedbackWornEditing = false;
      renderCallback();
      return true;
    case "feedback-worn-edit":
      state.feedbackWornEditing = true;
      renderCallback();
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
      } else if (group === "wornTop") {
        state.feedbackWornTop = value;
      } else if (group === "wornBottom") {
        state.feedbackWornBottom = value;
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
