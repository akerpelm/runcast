import { useState } from "react";
import {
  BOTTOM_OPTIONS, TOP_OPTIONS, dismissFeedbackToday, getFeedbackCount, getPersonalInsight, getShoeHistory,
  hasFeedbackToday, saveFeedback, type FeedbackState,
} from "@/lib/feedback";
import { syncFeedback } from "@/lib/sync";
import { useToday } from "./today-context";

const chip = "press inline-flex min-h-11 items-center rounded-full border px-4 text-[0.95rem] font-semibold";
const chipOn = "border-foreground bg-foreground text-background";
const chipOff = "border-hair text-foreground hover:bg-muted";
const primary = "press inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 text-base font-bold text-background hover:opacity-90";
const stepTitle = "font-(family-name:--font-body) text-base font-bold";

const FEEL = [
  { value: "too-cold", label: "Too cold" },
  { value: "just-right", label: "Just right" },
  { value: "too-warm", label: "Too warm" },
];
const EFFORT = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
  { value: "race", label: "Race" },
];

function Choice({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`${chip} ${on ? chipOn : chipOff}`}>
      {label}
    </button>
  );
}

export function LogSheet() {
  const { view, actions } = useToday();
  const { b } = view;
  const [top, setTop] = useState(b.clothing.top);
  const [bottom, setBottom] = useState(b.clothing.bottom);
  const [wornConfirmed, setWornConfirmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [feel, setFeel] = useState<string | null>(null);
  const [effort, setEffort] = useState<string | null>(null);
  const [shoes, setShoes] = useState<string | null>(null);
  const [otherShoe, setOtherShoe] = useState(false);

  if (view.logged && hasFeedbackToday()) {
    const count = getFeedbackCount();
    const insight = getPersonalInsight();
    return (
      <div className="py-2">
        <p className="text-lg font-bold">Logged. See you tomorrow.</p>
        <p className="mt-1 text-[0.95rem] text-muted-foreground">
          {count > 1 ? `${count} runs tracked on this device.` : "Your first run is tracked."}
          {insight ? ` ${insight}` : ""}
        </p>
      </div>
    );
  }

  const step = !wornConfirmed ? 1 : !feel ? 2 : !effort ? 3 : 4;
  const ready = wornConfirmed && feel && effort;
  const history = getShoeHistory();
  const toggle = (current: string | null, value: string) => (current === value ? null : value);

  function submit() {
    const state: FeedbackState = {
      feedbackWornTop: top,
      feedbackWornBottom: bottom,
      feedbackWornConfirmed: true,
      feedbackWornEditing: false,
      feedbackClothing: feel,
      feedbackEffortLevel: effort,
      feedbackShoes: shoes?.trim() || null,
      feedbackShoesOther: otherShoe,
      feedbackOpen: false,
      feedbackSubmitted: true,
    };
    saveFeedback(b, view.feedbackContext, state);
    syncFeedback();
    actions.markLogged();
    actions.closeSheet();
    actions.notify("success", "Run logged", "Thanks. Your kit picks get sharper with every log.");
  }

  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-muted-foreground">Step {step} of 4</p>
      <div className="space-y-4">
        <section>
          <h3 className={stepTitle}>{editing ? "What did you actually wear?" : "What did you wear?"}</h3>
          {editing ? (
            <>
              <p className="mt-3 text-sm font-semibold text-muted-foreground">Top</p>
              <div className="mt-1 flex flex-wrap gap-2">{TOP_OPTIONS.map((t) => <Choice key={t} label={t} on={t === top} onClick={() => setTop(t)} />)}</div>
              <p className="mt-3 text-sm font-semibold text-muted-foreground">Bottom</p>
              <div className="mt-1 flex flex-wrap gap-2">{BOTTOM_OPTIONS.map((t) => <Choice key={t} label={t} on={t === bottom} onClick={() => setBottom(t)} />)}</div>
              <button type="button" onClick={() => { setEditing(false); setWornConfirmed(true); }} className={`${primary} mt-4`}>Done</button>
            </>
          ) : (
            <>
              <dl className="mt-2 rounded-[14px] bg-muted px-4 py-3 text-[0.95rem]">
                <dt className="text-sm text-muted-foreground">Top</dt>
                <dd className="font-semibold">{top}</dd>
                <dt className="mt-2 text-sm text-muted-foreground">Bottom</dt>
                <dd className="font-semibold">{bottom}</dd>
              </dl>
              <p className="mt-2 text-sm text-muted-foreground">
                {top === b.clothing.top && bottom === b.clothing.bottom ? "Matches today's pick." : "Different from today's pick. That helps tune it."}
              </p>
              <div className="mt-3 flex gap-2">
                {!wornConfirmed && <button type="button" onClick={() => setWornConfirmed(true)} className={primary}>Wore this</button>}
                <button type="button" onClick={() => setEditing(true)} className={`${chip} ${chipOff}`}>Change</button>
              </div>
            </>
          )}
        </section>

        {step >= 2 && (
          <section className="border-t border-hair pt-4">
            <h3 className={stepTitle}>How did the clothing feel?</h3>
            <div className="mt-2 flex flex-wrap gap-2">{FEEL.map((o) => <Choice key={o.value} label={o.label} on={feel === o.value} onClick={() => setFeel(toggle(feel, o.value))} />)}</div>
          </section>
        )}
        {step >= 3 && (
          <section className="border-t border-hair pt-4">
            <h3 className={stepTitle}>How hard was it?</h3>
            <div className="mt-2 flex flex-wrap gap-2">{EFFORT.map((o) => <Choice key={o.value} label={o.label} on={effort === o.value} onClick={() => setEffort(toggle(effort, o.value))} />)}</div>
          </section>
        )}
        {step >= 4 && (
          <section className="border-t border-hair pt-4">
            <h3 className={stepTitle}>
              Shoes <span className="text-sm font-normal text-muted-foreground">optional</span>
            </h3>
            {history.length > 0 && !otherShoe ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {history.slice(0, 5).map((s) => <Choice key={s.name} label={s.name} on={shoes === s.name} onClick={() => setShoes(toggle(shoes, s.name))} />)}
                <button type="button" onClick={() => { setOtherShoe(true); setShoes(null); }} className={`${chip} ${chipOff}`}>Other shoe</button>
              </div>
            ) : (
              <>
                <label htmlFor="fb-shoe" className="sr-only">Shoe name</label>
                <input
                  id="fb-shoe"
                  type="text"
                  placeholder="e.g. Pegasus 41"
                  value={shoes ?? ""}
                  onChange={(e) => setShoes(e.target.value.trim() ? e.target.value : null)}
                  className="mt-2 h-12 w-full rounded-[12px] border border-input bg-card px-3 text-base"
                />
              </>
            )}
          </section>
        )}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-hair pt-4">
        <button
          type="button"
          onClick={() => { dismissFeedbackToday(); actions.closeSheet(); }}
          className="press min-h-11 rounded-full px-3 text-[0.95rem] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Not today
        </button>
        {ready && <button type="button" onClick={submit} className={primary}>Log it</button>}
      </div>
    </div>
  );
}
