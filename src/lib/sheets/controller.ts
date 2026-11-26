/**
 * Sheet + toast controller. The vanilla app owns all state; this store only
 * describes which sheet is open and what HTML it shows. The React host that
 * renders halo-ui-react's Drawer and Toaster loads on first use, so the first
 * paint ships no React.
 */
export type SheetId = "hours" | "kit" | "paces" | "settings" | "location" | "log";

export type SheetView = {
  id: SheetId;
  title: string;
  description?: string;
  html: string;
  /** Viewport fractions for the phone bottom sheet; omit to size to content. */
  snapPoints?: number[];
};

export type SheetSnapshot = { view: SheetView | null; open: boolean };

type ToastKind = "success" | "error" | "info";

let snapshot: SheetSnapshot = { view: null, open: false };
const listeners = new Set<() => void>();
const closeListeners = new Set<(id: SheetId) => void>();

function emit(next: SheetSnapshot): void {
  snapshot = next;
  for (const l of listeners) l();
}

export const sheetStore = {
  get: (): SheetSnapshot => snapshot,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

let hostPromise: Promise<typeof import("./host")> | null = null;

function loadHost(): Promise<typeof import("./host")> {
  hostPromise ??= import("./host").then((m) => {
    m.mountSheetHost();
    return m;
  });
  return hostPromise;
}

/** Warm the drawer bundle so the first tap opens instantly. */
export function preloadSheets(): void {
  void loadHost();
}

export function openSheet(view: SheetView): void {
  emit({ view, open: true });
  void loadHost();
}

/** Refresh the open sheet's body when the app re-renders; no-op for other sheets. */
export function updateSheet(id: SheetId, patch: Partial<Omit<SheetView, "id">>): void {
  if (!snapshot.open || snapshot.view?.id !== id) return;
  emit({ ...snapshot, view: { ...snapshot.view, ...patch } });
}

export function openSheetId(): SheetId | null {
  return snapshot.open && snapshot.view ? snapshot.view.id : null;
}

export function closeSheet(): void {
  if (!snapshot.open) return;
  const id = snapshot.view?.id;
  emit({ ...snapshot, open: false });
  if (id) for (const l of closeListeners) l(id);
}

export function onSheetClose(listener: (id: SheetId) => void): void {
  closeListeners.add(listener);
}

export function notify(kind: ToastKind, title: string, description?: string): void {
  void loadHost().then((m) => m.showToast(kind, title, description));
}
