/**
 * Pure formatting / display helper functions.
 * All functions take explicit params instead of reading global state.
 */

export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function esc(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function getDayLabel(dateStr: string): string {
  const today = localDateStr(new Date());
  if (dateStr === today) return "Today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === localDateStr(tomorrow)) return "Tomorrow";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
}

export function tempDisplay(f: number, useCelsius: boolean): string {
  if (useCelsius) return `${Math.round((f - 32) * 5 / 9)}°C`;
  return `${Math.round(f)}°F`;
}

export function tempDeltaDisplay(fDelta: number, useCelsius: boolean): string {
  if (useCelsius) return `${Math.round(fDelta * 5 / 9)}°`;
  return `${fDelta}°`;
}

export function tempUnit(useCelsius: boolean): string { return useCelsius ? "°C" : "°F"; }

export function speedDisplay(mph: number, useMetric: boolean): string {
  if (useMetric) return `${Math.round(mph * 1.609)} km/h`;
  return `${Math.round(mph)} mph`;
}

export function distDisplay(miles: number, useMetric: boolean, decimals = 1): string {
  if (useMetric) return `${(miles * 1.609).toFixed(decimals)} km`;
  return `${miles.toFixed(decimals)} mi`;
}

export function paceForDisplay(secPerMile: number, useMetric: boolean): number {
  return useMetric ? secPerMile / 1.609344 : secPerMile;
}

export function paceUnit(useMetric: boolean): string { return useMetric ? "/km" : "/mi"; }
