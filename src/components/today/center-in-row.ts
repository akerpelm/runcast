/**
 * Scroll a horizontal row so `el` sits in its middle, without moving the page
 * (scrollIntoView would also scroll the window vertically).
 */
export function centerInRow(el: HTMLElement | null): void {
  const row = el?.closest<HTMLElement>("[data-scroll-row]");
  if (!el || !row) return;
  const left = el.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
  row.scrollLeft = left - row.clientWidth / 2 + el.offsetWidth / 2;
}
