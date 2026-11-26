import { pinIcon } from "@/lib/icons";
import { SvgIcon } from "./svg-icon";
import { useToday } from "./today-context";

const GEAR = `<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>`;

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--track)" />
      <rect x="4.5" y="8.5" width="23" height="15" rx="7.5" fill="none" stroke="#fff" strokeWidth="1.6" />
      <rect x="9" y="13" width="14" height="6" rx="3" fill="var(--infield)" stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}

export function AppHeader() {
  const { view, actions } = useToday();
  const wordmark = (
    <span className="inline-flex items-center gap-2">
      <Mark />
      <span className="whitespace-nowrap font-(family-name:--font-display) text-[1.2rem] leading-none font-extrabold uppercase tracking-[0.01em] text-foreground max-[399px]:sr-only sm:text-[1.35rem]">
        Should I Run
      </span>
    </span>
  );

  return (
    <header className="sticky top-0 z-20 w-full border-b border-hair bg-background/90 backdrop-blur-sm" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {view.embed ? (
          <a href="https://shouldirun.today/" target="_blank" rel="noopener" className="flex min-h-11 items-center">
            {wordmark}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <a href="/" className="flex min-h-11 items-center rounded-lg">{wordmark}</a>
        )}

        {view.embed ? (
          <p className="flex min-w-0 items-center gap-1.5 text-[0.95rem] font-semibold">
            <SvgIcon svg={pinIcon} className="inline-flex text-primary" />
            <span className="truncate">{view.location.name}</span>
          </p>
        ) : (
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => actions.openSheet("location")}
              className="press flex min-h-11 min-w-0 items-center gap-1.5 rounded-full border border-hair bg-card px-3 text-[0.95rem] font-semibold hover:bg-muted"
            >
              <SvgIcon svg={pinIcon} className="inline-flex shrink-0 text-primary" />
              <span className="max-w-[11rem] truncate sm:max-w-[16rem]">{view.location.name}</span>
              {view.approximate && (
                <span className="inline-flex shrink-0 items-center text-sm font-medium text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-caution ring-1 ring-foreground/40 sm:hidden" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">approx.</span>
                </span>
              )}
              <span className="sr-only">, change location</span>
            </button>
            <button
              type="button"
              onClick={() => actions.openSheet("settings")}
              aria-label="Settings: units and appearance"
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
            >
              <SvgIcon svg={GEAR} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
