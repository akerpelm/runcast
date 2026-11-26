/** Renders one of the app's static, trusted SVG icon strings (src/lib/icons.ts). */
export function SvgIcon({ svg, className }: { svg: string; className?: string }) {
  return <span aria-hidden="true" className={className ?? "inline-flex shrink-0"} dangerouslySetInnerHTML={{ __html: svg }} />;
}
