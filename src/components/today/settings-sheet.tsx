import { SegmentedControl } from "./segmented-control";
import { useToday } from "./today-context";

export function SettingsSheet() {
  const { view, actions } = useToday();
  const { prefs } = view;
  return (
    <>
      <SegmentedControl
        label="Temperature"
        options={[{ value: "F", label: "°F" }, { value: "C", label: "°C" }]}
        value={prefs.celsius ? "C" : "F"}
        onChange={(v) => actions.setUnits({ celsius: v === "C" })}
      />
      <SegmentedControl
        label="Distance and pace"
        options={[{ value: "imperial", label: "Miles" }, { value: "metric", label: "Kilometres" }]}
        value={prefs.metric ? "metric" : "imperial"}
        onChange={(v) => actions.setUnits({ metric: v === "metric" })}
      />
      <SegmentedControl
        label="Appearance"
        options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
        value={actions.theme}
        onChange={actions.setTheme}
      />
      <p className="border-t border-hair pt-4 text-sm text-muted-foreground">
        Settings stay on this device. <a className="font-semibold text-foreground underline" href="/about/">How the numbers work</a>
      </p>
    </>
  );
}
