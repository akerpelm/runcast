/**
 * SVG icons and visual indicators for RunCast.
 * Weather icons use Lucide icon paths for clean, consistent line art.
 * Keyed by WMO weather interpretation code.
 */

// Weather icon SVG paths (Lucide)
const sun = `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`;

const cloudSun = `<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>`;

const cloud = `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>`;

const cloudFog = `<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/>`;

const cloudDrizzle = `<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1"/><path d="M8 14v1"/><path d="M16 19v1"/><path d="M16 14v1"/><path d="M12 21v1"/><path d="M12 16v1"/>`;

const cloudRain = `<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>`;

const cloudSnow = `<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/>`;

const cloudLightning = `<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>`;

const WMO_ICONS: Record<number, { svg: string; label: string; cls: string }> = {
  0:  { label: "Clear",             cls: "text-warning",          svg: sun },
  1:  { label: "Mainly clear",      cls: "text-warning",          svg: sun },
  2:  { label: "Partly cloudy",     cls: "text-muted-foreground", svg: cloudSun },
  3:  { label: "Overcast",          cls: "text-muted-foreground", svg: cloud },
  45: { label: "Fog",               cls: "text-muted-foreground", svg: cloudFog },
  48: { label: "Freezing fog",      cls: "text-info",             svg: cloudFog },
  51: { label: "Light drizzle",     cls: "text-info",             svg: cloudDrizzle },
  53: { label: "Drizzle",           cls: "text-info",             svg: cloudDrizzle },
  55: { label: "Heavy drizzle",     cls: "text-info",             svg: cloudDrizzle },
  56: { label: "Freezing drizzle",  cls: "text-info",             svg: cloudDrizzle },
  57: { label: "Heavy fzg drizzle", cls: "text-info",             svg: cloudDrizzle },
  61: { label: "Light rain",        cls: "text-info",             svg: cloudRain },
  63: { label: "Rain",              cls: "text-info",             svg: cloudRain },
  65: { label: "Heavy rain",        cls: "text-info",             svg: cloudRain },
  66: { label: "Freezing rain",     cls: "text-info",             svg: cloudRain },
  67: { label: "Heavy fzg rain",    cls: "text-info",             svg: cloudRain },
  71: { label: "Light snow",        cls: "text-info",             svg: cloudSnow },
  73: { label: "Snow",              cls: "text-info",             svg: cloudSnow },
  75: { label: "Heavy snow",        cls: "text-info",             svg: cloudSnow },
  77: { label: "Snow grains",       cls: "text-info",             svg: cloudSnow },
  80: { label: "Light showers",     cls: "text-info",             svg: cloudRain },
  81: { label: "Showers",           cls: "text-info",             svg: cloudRain },
  82: { label: "Heavy showers",     cls: "text-info",             svg: cloudRain },
  85: { label: "Snow showers",      cls: "text-info",             svg: cloudSnow },
  86: { label: "Heavy snow showers",cls: "text-info",             svg: cloudSnow },
  95: { label: "Thunderstorm",      cls: "text-warning",          svg: cloudLightning },
  96: { label: "T-storm w/ hail",   cls: "text-error",            svg: cloudLightning },
  99: { label: "T-storm heavy hail",cls: "text-error",            svg: cloudLightning },
};

const FALLBACK = { label: "Unknown", cls: "text-muted-foreground", svg: cloud };

export function getConditionIcon(weatherCode: number, size?: string): string {
  const entry = WMO_ICONS[weatherCode] || FALLBACK;
  const s = size || "h-5 w-5";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${s} ${entry.cls}">${entry.svg}</svg>`;
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

// ─── Safety Alert Severity Styles ───────────────────────────────────────────
export const ALERT_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  danger:  { bg: "bg-error/10",   border: "border-l-error",      text: "text-error",             icon: `<svg viewBox="0 0 24 24" ${s} class="h-4 w-4"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>` },
  warning: { bg: "bg-warning/10", border: "border-l-warning",    text: "text-warning", icon: `<svg viewBox="0 0 24 24" ${s} class="h-4 w-4"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>` },
  caution: { bg: "bg-warning/5",  border: "border-l-warning/50", text: "text-warning", icon: `<svg viewBox="0 0 24 24" ${s} class="h-4 w-4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>` },
  info:    { bg: "bg-info/5",     border: "border-l-info",       text: "text-info",    icon: `<svg viewBox="0 0 24 24" ${s} class="h-4 w-4"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>` },
};
