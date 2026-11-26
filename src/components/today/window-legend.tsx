/** Key for the best / also-good window outlines. */
export function WindowLegend({ withGood }: { withGood: boolean }) {
  return (
    <ul aria-label="Window marks" className="flex flex-wrap gap-x-6 gap-y-2">
      <li className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-[4px] border-[3px] border-window" aria-hidden="true" />
        Best window
      </li>
      {withGood && (
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-[4px] border-2 border-dashed border-window" aria-hidden="true" />
          Also good
        </li>
      )}
    </ul>
  );
}
