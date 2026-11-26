import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Drawer } from "halo-ui-react/drawer";
import { Toaster } from "halo-ui-react/toast";
// Imported as a URL so the build doesn't hoist it into the page head as
// render-blocking CSS; it's attached when this lazily loaded layer mounts.
import haloStylesUrl from "halo-ui-react/styles.css?url";
import type { SheetId } from "@/lib/today/url";
import { HoursSheet } from "./hours-sheet";
import { KitSheet } from "./kit-sheet";
import { LocationSheet } from "./location-sheet";
import { LogSheet } from "./log-sheet";
import { PacesSheet } from "./paces-sheet";
import { SettingsSheet } from "./settings-sheet";
import { useToday } from "./today-context";

if (typeof document !== "undefined" && !document.querySelector(`link[href="${haloStylesUrl}"]`)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = haloStylesUrl;
  document.head.append(link);
}

const wideQuery = typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)") : null;
const subscribeWide = (cb: () => void) => {
  wideQuery?.addEventListener("change", cb);
  return () => wideQuery?.removeEventListener("change", cb);
};
const subscribeTheme = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
};

type SheetSpec = { title: string; description?: string; snapPoints?: number[]; body: ReactNode };

function spec(id: SheetId, place: string, dayLabel: string): SheetSpec {
  switch (id) {
    case "hours": return { title: "Hour by hour", description: `${dayLabel} in ${place}. Pick an hour to see its call.`, snapPoints: [0.6, 0.94], body: <HoursSheet /> };
    case "kit": return { title: "What to wear", snapPoints: [0.6, 0.94], body: <KitSheet /> };
    case "paces": return { title: "Your paces", snapPoints: [0.94], body: <PacesSheet /> };
    case "settings": return { title: "Settings", body: <SettingsSheet /> };
    case "location": return { title: "Location", snapPoints: [0.94], body: <LocationSheet /> };
    case "log": return { title: "Log today's run", description: "About ten seconds. It tunes your kit picks over time.", snapPoints: [0.7, 0.94], body: <LogSheet /> };
  }
}

const closeIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/** halo-ui-react drawers and toasts. Loaded lazily so first paint ships none of it. */
export function SheetLayer() {
  const { view, actions } = useToday();
  const wide = useSyncExternalStore(subscribeWide, () => wideQuery?.matches ?? false, () => false);
  const theme = useSyncExternalStore(subscribeTheme, () => (document.documentElement.classList.contains("dark") ? "dark" : "light"), () => "light" as const);
  // Keep the last sheet's content mounted while it animates closed.
  const [last, setLast] = useState<SheetId | null>(view.sheet);
  if (view.sheet && view.sheet !== last) setLast(view.sheet);
  const id = view.sheet ?? last;
  const s = id ? spec(id, view.location.name, view.dayLabel) : null;

  return (
    <>
      <Toaster position="top-center" theme={theme} world="track" radius={14} offset={16} />
      {s && id && (
        <Drawer.Root
          key={`${id}-${wide ? "side" : "bottom"}`}
          open={view.sheet !== null}
          onOpenChange={(open) => {
            if (!open) actions.closeSheet();
          }}
          side={wide ? "right" : "bottom"}
          snapPoints={wide ? undefined : s.snapPoints}
          world="track"
          theme={theme}
          radius={20}
          recess={!wide}
        >
          <Drawer.Content className="sheet" data-sheet-id={id}>
            {!wide && <Drawer.Handle aria-label="Resize sheet" />}
            <div className="sheet-head">
              <Drawer.Title className="sheet-title">{s.title}</Drawer.Title>
              <Drawer.Close className="sheet-close press" aria-label="Close">{closeIcon}</Drawer.Close>
            </div>
            {s.description && <Drawer.Description className="sheet-desc">{s.description}</Drawer.Description>}
            <Drawer.Scroll className="sheet-scroll">{s.body}</Drawer.Scroll>
          </Drawer.Content>
        </Drawer.Root>
      )}
    </>
  );
}
