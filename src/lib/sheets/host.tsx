import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Drawer } from "halo-ui-react/drawer";
import { Toaster, toast } from "halo-ui-react/toast";
import "halo-ui-react/styles.css";
import { closeSheet, sheetStore } from "./controller";

function subscribeTheme(cb: () => void): () => void {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}
const getTheme = (): "dark" | "light" =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

const wideQuery = typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)") : null;
function subscribeWide(cb: () => void): () => void {
  wideQuery?.addEventListener("change", cb);
  return () => wideQuery?.removeEventListener("change", cb);
}
const getWide = (): boolean => wideQuery?.matches ?? false;

/** A stable selector for the focused control, so focus survives a body re-render. */
function focusKey(el: Element): string | null {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const attrs = ["data-action", "data-fb-group", "data-fb-value", "data-effort", "data-hour-index", "data-day", "data-value"];
  const parts = attrs
    .map((a) => (el.hasAttribute(a) ? `[${a}="${CSS.escape(el.getAttribute(a) ?? "")}"]` : ""))
    .join("");
  return parts || null;
}

function SheetBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = document.activeElement;
    const key = active && el.contains(active) ? focusKey(active) : null;
    el.innerHTML = html;
    if (key) el.querySelector<HTMLElement>(key)?.focus();
    // Open long lists at the selected row rather than midnight.
    if (first.current) {
      el.querySelector("[data-hour-index][aria-pressed='true']")?.scrollIntoView({ block: "center" });
      first.current = false;
    }
  }, [html]);
  return <div ref={ref} className="sheet-body" />;
}

const closeIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

function SheetHost() {
  const { view, open } = useSyncExternalStore(sheetStore.subscribe, sheetStore.get);
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "light" as const);
  const wide = useSyncExternalStore(subscribeWide, getWide, () => false);

  return (
    <>
      <Toaster position="top-center" theme={theme} world="track" radius={14} offset={16} />
      {view && (
        <Drawer.Root
          key={`${view.id}-${wide ? "side" : "bottom"}`}
          open={open}
          onOpenChange={(next) => {
            if (!next) closeSheet();
          }}
          side={wide ? "right" : "bottom"}
          snapPoints={wide ? undefined : view.snapPoints}
          world="track"
          theme={theme}
          radius={20}
          recess={!wide}
        >
          <Drawer.Content className="sheet" data-sheet-id={view.id}>
            {!wide && <Drawer.Handle aria-label="Resize sheet" />}
            <div className="sheet-head">
              <Drawer.Title className="sheet-title">{view.title}</Drawer.Title>
              <Drawer.Close className="sheet-close press" aria-label="Close">
                {closeIcon}
              </Drawer.Close>
            </div>
            {view.description && <Drawer.Description className="sheet-desc">{view.description}</Drawer.Description>}
            <Drawer.Scroll className="sheet-scroll">
              <SheetBody html={view.html} />
            </Drawer.Scroll>
          </Drawer.Content>
        </Drawer.Root>
      )}
    </>
  );
}

let root: Root | null = null;

export function mountSheetHost(): void {
  if (root) return;
  const el = document.createElement("div");
  el.id = "sheet-host";
  document.body.append(el);
  root = createRoot(el);
  root.render(<SheetHost />);
}

export function showToast(kind: "success" | "error" | "info", title: string, description?: string): void {
  toast[kind](title, description ? { description } : undefined);
}
