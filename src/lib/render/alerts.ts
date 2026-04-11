/**
 * Render: Safety alerts
 */
import type { SafetyAlert } from "../formulas/safety";
import { esc } from "../display";
import { ALERT_STYLES, chevronUp, chevronDown } from "../icons";

export function renderAlerts(alerts: SafetyAlert[], alertsExpanded: boolean): string {
  const checkSvg = `<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

  if (!alerts.length) {
    return `<div class="mb-3 flex items-center gap-2 rounded-[var(--radius-base)] bg-success/5 px-3 py-2">
      <span class="text-success-foreground shrink-0">${checkSvg}</span>
      <p class="text-xs font-medium text-success-foreground">No safety concerns</p>
    </div>`;
  }

  const worst = alerts[0];
  const st = ALERT_STYLES[worst.severity] || ALERT_STYLES.info;

  if (alerts.length === 1) {
    return `<div class="mb-3 rounded-[var(--radius-base)] border-l-4 ${st.border} ${st.bg} px-3 py-2">
      <div class="flex items-center gap-2">
        <span class="${st.text} shrink-0">${st.icon}</span>
        <div class="min-w-0">
          <p class="text-xs font-bold ${st.text}">${esc(worst.title)}</p>
          <p class="text-xs text-muted-foreground truncate">${esc(worst.message)}</p>
        </div>
      </div>
    </div>`;
  }

  // Multiple alerts — collapsible summary
  const expanded = alertsExpanded;
  const types = [...new Set(alerts.map(a => a.title.split(":")[0].trim()))].slice(0, 3).join(", ");

  let details = "";
  if (expanded) {
    details = alerts.map(a => {
      const ast = ALERT_STYLES[a.severity] || ALERT_STYLES.info;
      return `<div class="mt-2 border-t border-border/30 pt-2">
        <p class="text-xs font-bold ${ast.text}">${esc(a.title)}</p>
        <p class="text-xs text-muted-foreground">${esc(a.message)}</p>
      </div>`;
    }).join("");
  }

  return `<div class="mb-3 rounded-[var(--radius-base)] border-l-4 ${st.border} ${st.bg} px-3 py-2">
    <button data-action="toggle-alerts" aria-label="Toggle safety alerts" aria-expanded="${expanded}" class="flex w-full items-center gap-2 text-left">
      <span class="${st.text} shrink-0">${st.icon}</span>
      <p class="flex-1 text-xs font-bold ${st.text}">${alerts.length} alerts: ${types}</p>
      <span class="text-muted-foreground shrink-0">${expanded ? chevronUp : chevronDown}</span>
    </button>
    ${details}
  </div>`;
}
