/** Loading layout for the Today screen; also server-rendered as the island's fallback. */
export function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading today's briefing">
      <header className="sticky top-0 z-20 w-full border-b border-hair bg-background/90" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <span className="h-8 w-8 rounded-lg bg-track" aria-hidden="true" />
          <span className="h-11 w-40 rounded-full skeleton-pulse" />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
        <p className="sr-only">Loading today's briefing…</p>
        <div className="flex gap-2 pb-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-11 w-24 rounded-full skeleton-pulse" />)}
        </div>
        <div className="mb-8 hidden h-[6.5rem] rounded-[14px] skeleton-pulse lg:block" />
        <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
          <div>
            <div className="rounded-[20px] bg-infield/90 px-5 pt-5 pb-6">
              <div className="h-12 w-64 rounded bg-white/25" />
              <div className="mt-4 h-5 w-40 rounded bg-white/20" />
              <div className="mt-2 h-4 w-56 rounded bg-white/15" />
            </div>
            <div className="-mt-4 rounded-b-[20px] bg-track/90 pt-8 pb-2">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[3.25rem] border-t-2 border-white/60" />)}
            </div>
          </div>
          <div className="hidden h-[28rem] rounded-[20px] skeleton-pulse lg:block" />
        </div>
      </div>
    </div>
  );
}
