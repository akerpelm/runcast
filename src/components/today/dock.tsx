import { checkIcon, clockIcon, flagIcon, shirtIcon } from "@/lib/icons";
import type { SheetId } from "@/lib/today/url";
import { SvgIcon } from "./svg-icon";
import { useToday } from "./today-context";

/** Phone: thumb-reach shortcuts, pinned above the safe area. */
export function Dock() {
  const { view, actions } = useToday();
  const item = (id: SheetId, icon: string, label: string, muted = false) => (
    <button
      type="button"
      onClick={() => actions.openSheet(id)}
      className={`press flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-sm font-semibold hover:bg-muted ${muted ? "text-muted-foreground" : ""}`}
    >
      <SvgIcon svg={icon} />
      <span>{label}</span>
    </button>
  );
  return (
    <nav aria-label="Quick actions" className="pad-safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-background/95 px-3 pt-2 backdrop-blur-sm lg:hidden">
      <div className="mx-auto flex max-w-md gap-1">
        {item("hours", clockIcon, "Hours")}
        {item("kit", shirtIcon, "Kit")}
        {view.logged ? item("log", checkIcon, "Logged", true) : item("log", flagIcon, "Log run")}
      </div>
    </nav>
  );
}
