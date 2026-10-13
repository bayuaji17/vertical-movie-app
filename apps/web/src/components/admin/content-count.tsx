/** A small number next to a label; renders nothing until the count is known. */
export function ContentCount({ value }: { value: number | undefined }) {
  if (value === undefined) return null
  return (
    <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
      {value}
      <span className="sr-only"> items</span>
    </span>
  )
}
