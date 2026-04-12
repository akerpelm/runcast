/**
 * HTML string helpers matching Starwind component markup patterns.
 * Used by innerHTML render modules for visual consistency with
 * the Starwind Astro components used in static pages.
 */

// ─── Badge ──────────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "primary" | "secondary" | "outline" | "ghost" | "info" | "success" | "warning" | "error";
type BadgeSize = "sm" | "md" | "lg";

const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-foreground text-background",
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border-border border",
  ghost: "bg-foreground/10 text-foreground",
  info: "bg-info text-info-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  error: "bg-error text-error-foreground",
};

const BADGE_SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "px-2.5 py-0.5 text-xs",
  md: "px-3 py-0.5 text-sm",
  lg: "px-4 py-1 text-base",
};

export function htmlBadge(
  content: string,
  opts?: { variant?: BadgeVariant; size?: BadgeSize; class?: string },
): string {
  const v = opts?.variant ?? "default";
  const s = opts?.size ?? "sm";
  const extra = opts?.class ?? "";
  return `<span class="starwind-badge inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${BADGE_VARIANT_CLASSES[v]} ${BADGE_SIZE_CLASSES[s]} ${extra}" data-slot="badge">${content}</span>`;
}

// ─── Card ───────────────────────────────────────────────────────────────────

type CardSize = "default" | "sm";

export function htmlCard(
  content: string,
  opts?: { size?: CardSize; class?: string },
): string {
  const s = opts?.size ?? "default";
  const sizeClass = s === "sm" ? "gap-4 py-4 text-sm" : "gap-6 py-6";
  const extra = opts?.class ?? "";
  return `<div class="bg-card text-card-foreground card-surface flex flex-col ${sizeClass} ${extra}" data-slot="card" data-size="${s}">${content}</div>`;
}

export function htmlCardContent(content: string, opts?: { class?: string }): string {
  const extra = opts?.class ?? "";
  return `<div class="px-6 ${extra}" data-slot="card-content">${content}</div>`;
}

// ─── Button ─────────────────────────────────────────────────────────────────

type ButtonVariant = "default" | "primary" | "secondary" | "outline" | "ghost" | "info" | "success" | "warning" | "error";
type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon" | "icon-lg";

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: "bg-foreground text-background hover:bg-foreground/90",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  outline: "bg-background hover:bg-muted hover:text-foreground border",
  ghost: "hover:bg-muted hover:text-foreground",
  info: "bg-info text-info-foreground hover:bg-info/90",
  success: "bg-success text-success-foreground hover:bg-success/90",
  warning: "bg-warning text-warning-foreground hover:bg-warning/90",
  error: "bg-error text-error-foreground hover:bg-error/90",
};

const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-12 px-8 text-lg",
  "icon-sm": "size-9",
  icon: "size-11",
  "icon-lg": "size-12",
};

export function htmlButton(
  content: string,
  opts?: { variant?: ButtonVariant; size?: ButtonSize; dataAction?: string; class?: string; disabled?: boolean; ariaLabel?: string },
): string {
  const v = opts?.variant ?? "default";
  const s = opts?.size ?? "md";
  const extra = opts?.class ?? "";
  const action = opts?.dataAction ? ` data-action="${opts.dataAction}"` : "";
  const disabled = opts?.disabled ? " disabled" : "";
  const ariaLabel = opts?.ariaLabel ? ` aria-label="${opts.ariaLabel}"` : "";
  return `<button class="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-base)] font-medium whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-50 ${BUTTON_VARIANT_CLASSES[v]} ${BUTTON_SIZE_CLASSES[s]} ${extra}" data-slot="button"${action}${disabled}${ariaLabel}>${content}</button>`;
}
