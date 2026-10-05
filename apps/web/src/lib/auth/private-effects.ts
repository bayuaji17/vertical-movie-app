import type { QueryClient } from '@tanstack/react-query'

const effects = new WeakMap<QueryClient, Set<() => void>>()
export function registerPrivateEffect(cache: QueryClient, stop: () => void) {
  let set = effects.get(cache)
  if (!set) {
    set = new Set()
    effects.set(cache, set)
  }
  set.add(stop)
  return () => {
    set.delete(stop)
  }
}
export function stopAdminPrivateEffects(cache: QueryClient) {
  for (const stop of Array.from(effects.get(cache) ?? [])) stop()
}
