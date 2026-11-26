/** Names the problem and the recovery. */
export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <section role="alert" className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
      <div className="rounded-[20px] border border-hair bg-card p-6">
        <h2 className="font-(family-name:--font-display) text-2xl font-bold uppercase">Forecast unavailable</h2>
        <p className="mt-2 text-[0.95rem] text-muted-foreground">We couldn't load today's weather ({message}). Check your connection and try again.</p>
        <button type="button" onClick={retry} className="press mt-4 inline-flex min-h-12 items-center rounded-full bg-foreground px-6 text-base font-bold text-background">
          Try again
        </button>
      </div>
    </section>
  );
}
