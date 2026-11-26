import { useEffect, useRef } from "react";
import { getDayLabel } from "@/lib/display";
import { centerInRow } from "./center-in-row";
import { useToday } from "./today-context";

export function DayTabs() {
  const { view, actions } = useToday();
  const active = useRef<HTMLButtonElement>(null);

  // Keep the chosen day in view when the row scrolls (DOM sync only).
  useEffect(() => {
    centerInRow(active.current);
  }, [view.day]);

  return (
    <nav aria-label="Choose a day" data-scroll-row className="no-scrollbar fade-edge -mx-4 flex gap-1 overflow-x-auto px-4 pb-3">
      {view.days.map((d) => {
        const on = d.date === view.day;
        return (
          <button
            key={d.date}
            ref={on ? active : undefined}
            type="button"
            aria-pressed={on}
            onClick={() => actions.selectDay(d.date)}
            className={`press min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {getDayLabel(d.date)}
          </button>
        );
      })}
    </nav>
  );
}
