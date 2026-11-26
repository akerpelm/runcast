/**
 * SVG icons and visual indicators for RunCast.
 * Weather icons use Lucide icon paths for clean, consistent line art.
 * Keyed by WMO weather interpretation code.
 */

// Weather icon SVG paths (Lucide)
const sun = `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`;

const cloudSun = `<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>`;

const moon = `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;

const cloudMoon = `<path d="M13 16a3 3 0 1 1 0 6H7a5 5 0 1 1 4.9-6Z"/><path d="M10.1 9A6 6 0 0 1 16 4a4.24 4.24 0 0 0 6 6 6 6 0 0 1-3 5.197"/>`;

const cloud = `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>`;

const cloudFog = `<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/>`;

const cloudDrizzle = `<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1"/><path d="M8 14v1"/><path d="M16 19v1"/><path d="M16 14v1"/><path d="M12 21v1"/><path d="M12 16v1"/>`;

const cloudRain = `<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>`;

const cloudSnow = `<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/>`;

const cloudLightning = `<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>`;

const WMO_ICONS: Record<number, { svg: string; label: string }> = {
  0:  { label: "Clear",            svg: sun },
  1:  { label: "Mainly clear",     svg: sun },
  2:  { label: "Partly cloudy",    svg: cloudSun },
  3:  { label: "Overcast",         svg: cloud },
  45: { label: "Fog",              svg: cloudFog },
  48: { label: "Freezing fog",     svg: cloudFog },
  51: { label: "Light drizzle",    svg: cloudDrizzle },
  53: { label: "Drizzle",          svg: cloudDrizzle },
  55: { label: "Heavy drizzle",    svg: cloudDrizzle },
  56: { label: "Freezing drizzle", svg: cloudDrizzle },
  57: { label: "Heavy fzg drizzle",svg: cloudDrizzle },
  61: { label: "Light rain",       svg: cloudRain },
  63: { label: "Rain",             svg: cloudRain },
  65: { label: "Heavy rain",       svg: cloudRain },
  66: { label: "Freezing rain",    svg: cloudRain },
  67: { label: "Heavy fzg rain",   svg: cloudRain },
  71: { label: "Light snow",       svg: cloudSnow },
  73: { label: "Snow",             svg: cloudSnow },
  75: { label: "Heavy snow",       svg: cloudSnow },
  77: { label: "Snow grains",      svg: cloudSnow },
  80: { label: "Light showers",    svg: cloudRain },
  81: { label: "Showers",          svg: cloudRain },
  82: { label: "Heavy showers",    svg: cloudRain },
  85: { label: "Snow showers",     svg: cloudSnow },
  86: { label: "Heavy snow showers", svg: cloudSnow },
  95: { label: "Thunderstorm",     svg: cloudLightning },
  96: { label: "T-storm w/ hail",  svg: cloudLightning },
  99: { label: "T-storm heavy hail", svg: cloudLightning },
};

const FALLBACK = { label: "Unknown",svg: cloud };

const NIGHT_SVG: Record<number, string> = { 0: moon, 1: moon, 2: cloudMoon };

/** Weather glyph; clear and partly-cloudy codes swap to moon variants after dark. */
export function getConditionIcon(weatherCode: number, size?: string, isNight = false): string {
  const entry = WMO_ICONS[weatherCode] || FALLBACK;
  const s = size || "h-5 w-5";
  const svg = (isNight && NIGHT_SVG[weatherCode]) || entry.svg;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${s}" aria-hidden="true">${svg}</svg>`;
}

export function getConditionLabel(weatherCode: number): string {
  return (WMO_ICONS[weatherCode] || FALLBACK).label;
}

// ─── Navigation / UI Icons ──────────────────────────────────────────────────
const s = 'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"';
export const chevronLeft = `<svg viewBox="0 0 24 24" ${s} class="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>`;
export const chevronRight = `<svg viewBox="0 0 24 24" ${s} class="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>`;
export const chevronUp = `<svg viewBox="0 0 24 24" ${s} class="h-4 w-4"><path d="m18 15-6-6-6 6"/></svg>`;
export const chevronDown = `<svg viewBox="0 0 24 24" ${s} class="h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>`;
export const settingsIcon = `<svg viewBox="0 0 24 24" ${s} class="h-4 w-4"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;

const a = 'aria-hidden="true" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
export const pinIcon = `<svg viewBox="0 0 24 24" ${a} class="h-4 w-4"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
export const crosshairIcon = `<svg viewBox="0 0 24 24" ${a} class="h-5 w-5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/></svg>`;
export const clockIcon = `<svg viewBox="0 0 24 24" ${a} class="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
export const shirtIcon = `<svg viewBox="0 0 24 24" ${a} class="h-5 w-5"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`;
export const flagIcon = `<svg viewBox="0 0 24 24" ${a} class="h-5 w-5"><path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/></svg>`;
export const checkIcon = `<svg viewBox="0 0 24 24" ${a} class="h-5 w-5"><path d="M20 6 9 17l-5-5"/></svg>`;
export const searchIcon = `<svg viewBox="0 0 24 24" ${a} class="h-4 w-4"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`;

/** Hazard marks: shape carries severity so meaning never rests on colour alone. */
export function hazardMark(severity: "info" | "caution" | "warning" | "danger"): string {
  if (severity === "danger") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" class="h-6 w-6 shrink-0"><path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9Z" fill="var(--danger)" stroke="#fff" stroke-width="1.5"/><path d="M12 7v6M12 16.5v.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  }
  if (severity === "info") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" class="h-6 w-6 shrink-0"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 7.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true" class="h-6 w-6 shrink-0"><path d="M12 1.5 22.5 12 12 22.5 1.5 12Z" fill="var(--caution)" stroke="#16181a" stroke-width="1.2"/><path d="M12 7v6M12 16.5v.5" stroke="#16181a" stroke-width="2.4" stroke-linecap="round"/></svg>`;
}
