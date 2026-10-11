import { useEffect, useRef, useState } from 'react'

/**
 * Tracks whether collapsed (line-clamped) text actually overflows so a
 * "Read more" control only shows when it would reveal something.
 */
export function useTextClamp() {
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false),
    [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element || expanded) return
    const measure = () =>
      setOverflowing(element.scrollHeight > element.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [expanded])
  return {
    ref,
    expanded,
    overflowing,
    toggle: () => setExpanded((value) => !value),
  }
}
