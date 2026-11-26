import { ConditionsList } from "./conditions-list";
import { HourTable } from "./hour-table";
import { RunWindows } from "./run-windows";
import { WindowLegend } from "./window-legend";
import { useToday } from "./today-context";

const sectionTitle = "font-(family-name:--font-display) text-lg font-bold uppercase tracking-[0.04em]";

export function HoursSheet() {
  const { view } = useToday();
  return (
    <>
      <div className="mb-4 space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2.5">
          <span className="relative h-5 w-14 shrink-0 overflow-hidden rounded-[6px] bg-muted" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 w-2/3 bg-window/30" />
          </span>
          The shaded bar behind each hour shows how good it is for running, compared with the rest of the day. Longer is better.
        </p>
        <WindowLegend withGood={view.bw.ranked.length > 1} />
      </div>
      <HourTable />
      <h3 className={`mt-6 ${sectionTitle}`}>Run windows</h3>
      <RunWindows />
      <h3 className={`mt-6 mb-3 ${sectionTitle}`}>Conditions</h3>
      <ConditionsList />
    </>
  );
}
