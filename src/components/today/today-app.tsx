import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { syncFeedback } from "@/lib/sync";
import { AppHeader } from "./app-header";
import { ConditionsGrid } from "./conditions-grid";
import { DayRibbon } from "./day-ribbon";
import { DayTabs } from "./day-tabs";
import { Dock } from "./dock";
import { EffortLanes } from "./effort-lanes";
import { ErrorState } from "./error-state";
import { HourStrip } from "./hour-strip";
import { KitCompact } from "./kit-compact";
import { LogRow } from "./log-row";
import { LAYER_EVENT } from "./notify";
import { RunWindows } from "./run-windows";
import { Skeleton } from "./skeleton";
import { TodayContext } from "./today-context";
import { useTodayState } from "./use-today-state";
import { VerdictPanel } from "./verdict-panel";

const SheetLayer = lazy(() => import("./sheet-layer").then((m) => ({ default: m.SheetLayer })));

const sectionTitle = "font-(family-name:--font-display) text-lg font-bold uppercase tracking-[0.04em]";

function TodayScreen({ embed }: { embed: boolean }) {
  const state = useTodayState(embed);
  const [layerWanted, setLayerWanted] = useState(false);

  // External signals: idle time warms the sheet layer; toasts and the footer's
  // "Log a run" link ask for it directly.
  useEffect(() => {
    if (embed) return;
    syncFeedback();
    const want = () => setLayerWanted(true);
    window.addEventListener(LAYER_EVENT, want);
    const hasIdle = typeof requestIdleCallback === "function";
    const idle = hasIdle ? requestIdleCallback(want, { timeout: 4000 }) : setTimeout(want, 2500);
    return () => {
      window.removeEventListener(LAYER_EVENT, want);
      if (hasIdle) cancelIdleCallback(idle as number);
      else clearTimeout(idle);
    };
  }, [embed]);

  const openLog = state.status === "ready" ? state.actions.openSheet : null;
  useEffect(() => {
    if (!openLog) return;
    const onOpen = () => openLog("log");
    window.addEventListener("runcast:open-feedback", onOpen);
    return () => window.removeEventListener("runcast:open-feedback", onOpen);
  }, [openLog]);

  if (state.status === "loading") return <Skeleton />;
  if (state.status === "error") return <ErrorState message={state.message} retry={state.retry} />;

  const { view, actions } = state;
  return (
    <TodayContext.Provider value={{ view, actions }}>
      <AppHeader />
      <main data-halo-recess className="mx-auto max-w-6xl bg-background px-4 pt-3 sm:px-6">
        {/* The page's h1 is the server-rendered "Should I run today?" below the app, so search engines see it without JavaScript. */}
        <h2 className="sr-only">Today's running briefing</h2>
        <p className="sr-only" aria-live="polite">{view.updating ? "Updating forecast…" : ""}</p>
        <DayTabs />
        <DayRibbon />
        <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <VerdictPanel />
            <EffortLanes />
            <HourStrip />
            {!embed && <LogRow />}
          </div>
          <aside aria-label="Hour detail" className="hidden min-w-0 space-y-5 lg:block">
            <KitCompact />
            <ConditionsGrid />
            <section aria-labelledby="aside-windows">
              <h2 id="aside-windows" className={sectionTitle}>Run windows</h2>
              <div className="mt-1"><RunWindows /></div>
            </section>
          </aside>
        </div>
      </main>
      {!embed && <Dock />}
      {!embed && (layerWanted || view.sheet) && (
        <Suspense fallback={null}>
          <SheetLayer />
        </Suspense>
      )}
    </TodayContext.Provider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

/** The Today screen as one React island. */
export function TodayApp({ embed = false }: { embed?: boolean }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TodayScreen embed={embed} />
    </QueryClientProvider>
  );
}
