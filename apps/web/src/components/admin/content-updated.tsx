import { fullTime, relativeTime } from '#/lib/admin/content-time'

/** `<time>` with a relative label; the exact local time is in the tooltip. */
export function ContentUpdated({
  value,
  now,
}: {
  value: string
  now?: number
}) {
  return (
    <time dateTime={value} title={fullTime(value)}>
      {relativeTime(value, { now })}
    </time>
  )
}
