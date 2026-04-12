/**
 * Render: Error display — returns HTML string
 */
import { esc } from "../display";

export function renderErrorHTML(message: string): string {
  return `<div class="bg-card text-card-foreground card-surface p-6" data-slot="card">
    <div class="flex items-center gap-3 text-error">
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      <p class="text-sm font-medium">${esc(message)}</p>
    </div>
  </div>`;
}
