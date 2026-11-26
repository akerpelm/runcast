import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchLocations } from "@/lib/geo";
import { crosshairIcon, searchIcon } from "@/lib/icons";
import { SvgIcon } from "./svg-icon";
import { useToday } from "./today-context";
import { fieldClass } from "./field";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function LocationSheet() {
  const { view, actions } = useToday();
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const q = useDebounced(query.trim(), 250);
  const places = useQuery({ queryKey: ["places", q], queryFn: () => searchLocations(q), enabled: q.length >= 2, staleTime: Infinity });
  const results = q.length >= 2 ? places.data ?? [] : [];

  const choose = (i: number) => {
    const r = results[i];
    if (!r) return;
    actions.changeLocation({ latitude: r.latitude, longitude: r.longitude, name: r.admin1 ? `${r.name}, ${r.admin1}` : `${r.name}, ${r.country}`, source: "saved" });
  };

  return (
    <>
      <p className="text-[0.95rem] text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{view.location.name}</span>
        {view.approximate ? ", based on your network. Set it for exact conditions." : "."}
      </p>
      <button
        type="button"
        aria-busy={locating}
        onClick={async () => {
          setLocating(true);
          await actions.usePreciseLocation();
          setLocating(false);
        }}
        className="press mt-4 flex min-h-14 w-full items-center gap-3 rounded-[14px] bg-foreground px-4 py-3 text-left text-base font-bold text-background hover:opacity-90 aria-busy:opacity-70"
      >
        <SvgIcon svg={crosshairIcon} />
        <span>
          {locating ? "Finding you…" : "Use my precise location"}
          <span className="mt-0.5 block text-sm font-normal opacity-80">Your browser will ask once</span>
        </span>
      </button>
      <form
        className="mt-5"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          choose(0);
        }}
      >
        <label htmlFor="loc-search" className="text-sm font-semibold text-muted-foreground">Or search for a city</label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
            <SvgIcon svg={searchIcon} />
          </span>
          <input
            id="loc-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="City or town"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby="loc-status"
            aria-controls="loc-results"
            className={`${fieldClass} pl-10`}
          />
        </div>
        <p id="loc-status" className="sr-only" aria-live="polite">
          {q.length >= 2 && places.isSuccess ? (results.length ? `${results.length} places found` : "No places found") : ""}
        </p>
        <ul id="loc-results" className="mt-2">
          {q.length >= 2 && places.isSuccess && results.length === 0 && (
            <li className="py-3 text-[0.95rem] text-muted-foreground">No places match “{q}”. Try a nearby larger town.</li>
          )}
          {results.map((r, i) => (
            <li key={`${r.latitude},${r.longitude}`}>
              <button type="button" onClick={() => choose(i)} className="press flex min-h-12 w-full items-center rounded-[12px] px-3 text-left text-base font-semibold hover:bg-muted">
                {r.admin1 ? `${r.name}, ${r.admin1}, ${r.country}` : `${r.name}, ${r.country}`}
              </button>
            </li>
          ))}
        </ul>
      </form>
    </>
  );
}
