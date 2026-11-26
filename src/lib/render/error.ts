/**
 * Render: Error display. Names the problem and the recovery.
 */
import { esc } from "../display";

export function renderErrorHTML(message: string): string {
  return `<section role="alert" class="rounded-[20px] border border-hair bg-card p-6">
    <h2 class="font-(family-name:--font-display) text-2xl font-bold uppercase">Forecast unavailable</h2>
    <p class="mt-2 text-[0.95rem] text-muted-foreground">We couldn't load today's weather (${esc(message)}). Check your connection and try again.</p>
    <button type="button" data-action="retry" class="press mt-4 inline-flex min-h-12 items-center rounded-full bg-foreground px-6 text-base font-bold text-background">Try again</button>
  </section>`;
}
