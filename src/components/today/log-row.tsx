import { useToday } from "./today-context";

/** Desktop: the quiet "log a run" control under the lanes. */
export function LogRow() {
  const { view, actions } = useToday();
  return (
    <div className="mt-6 hidden items-center justify-between border-t border-hair pt-4 lg:flex">
      <p className="text-[0.95rem] text-muted-foreground">{view.logged ? "Today's run is logged." : "Ran today? A quick log tunes your kit picks."}</p>
      <button type="button" onClick={() => actions.openSheet("log")} className="press min-h-11 rounded-full border border-foreground px-5 text-sm font-semibold hover:bg-foreground hover:text-background">
        {view.logged ? "View log" : "Log run"}
      </button>
    </div>
  );
}
