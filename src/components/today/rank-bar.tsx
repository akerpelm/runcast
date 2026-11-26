import { bandBarPercent } from "@/lib/today/model";

/** Non-colour rank cue at the foot of an hour cell: a longer bar is a better hour. */
export function RankBar({ band, className }: { band: number | undefined; className: string }) {
  if (band === undefined) return null;
  return (
    <span className={`pointer-events-none absolute h-1 overflow-hidden rounded-full ${className}`} aria-hidden="true">
      <span className="block h-full rounded-full bg-current opacity-75" style={{ width: `${bandBarPercent(band)}%` }} />
    </span>
  );
}
