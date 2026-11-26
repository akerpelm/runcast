/**
 * Toasts via halo-ui-react, loaded on demand. Firing one asks the app to mount
 * the sheet layer (which hosts the Toaster) if it hasn't yet.
 */
type Kind = "success" | "error" | "info";

let toastModule: Promise<typeof import("halo-ui-react/toast")> | null = null;

export const LAYER_EVENT = "runcast:sheet-layer";

export function notify(kind: Kind, title: string, description?: string): void {
  window.dispatchEvent(new Event(LAYER_EVENT));
  toastModule ??= import("halo-ui-react/toast");
  void toastModule.then((m) => m.toast[kind](title, description ? { description } : undefined));
}
