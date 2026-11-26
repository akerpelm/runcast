/** A labelled row of mutually exclusive options; each is a pressed/unpressed button. */
export function SegmentedControl<T extends string>({
  label, options, value, onChange,
}: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset className="border-t border-hair py-4">
      <legend className="float-left mb-2 w-full text-sm font-semibold text-muted-foreground">{label}</legend>
      <div className="clear-both grid gap-1 rounded-full bg-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length},1fr)` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={`press min-h-11 rounded-full text-[0.95rem] font-semibold ${o.value === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
