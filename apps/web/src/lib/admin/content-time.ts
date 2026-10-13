const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const minute = 60_000,
  hour = 60 * minute,
  day = 24 * hour

type TimeOptions = { now?: number; timeZone?: string }

/** Short, human timestamp: "2 hours ago" for a week, then a calendar date. */
export function relativeTime(
  iso: string,
  { now = Date.now(), timeZone }: TimeOptions = {},
) {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  const age = Math.max(0, now - time)
  if (age < minute) return 'Just now'
  if (age < hour) return relative.format(-Math.floor(age / minute), 'minute')
  if (age < day) return relative.format(-Math.floor(age / hour), 'hour')
  if (age < 7 * day) return relative.format(-Math.floor(age / day), 'day')
  return new Date(time).toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
  })
}
/** Full local date and time, for the tooltip next to the relative value. */
export function fullTime(iso: string, timeZone?: string) {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  return new Date(time).toLocaleString('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  })
}
