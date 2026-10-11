import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  catalogQueryKey,
  createCatalogDebounce,
} from '#/lib/catalog/public-catalog-queries'
import { defaultCatalogFilters } from '#/lib/catalog/public-catalog-model'
import {
  browseFilters,
  browseSearch,
  normalizeQuery,
  searchMaxLength,
} from '#/lib/public/catalog-model'
import type { CatalogType } from '#/lib/public/catalog-model'

/**
 * URL-driven Browse filters. The text input is local state; the URL `q` is
 * written 300 ms after the last keystroke (never while an IME composes) with
 * `replace`, so Back is not filled with typing. Type changes flush the draft.
 */
export function useBrowseSearch(type: CatalogType, q: string) {
  const navigate = useNavigate({ from: '/' }),
    client = useQueryClient()
  const [draft, setDraft] = useState(q),
    [switching, setSwitching] = useState(false)
  const composing = useRef(false),
    committed = useRef(q),
    revision = useRef(0),
    current = useRef({ type, q }),
    apply = useRef<(value: string) => Promise<void>>(async () => undefined)
  current.current = { type, q }
  const [debounce] = useState(() =>
    createCatalogDebounce((filters) => apply.current(filters.search)),
  )
  const go = useCallback(
    async (nextType: CatalogType, nextQ: string) => {
      const request = ++revision.current,
        from = current.current
      committed.current = nextQ
      setSwitching(true)
      // Stop the superseded request and start the destination from page one.
      await client.cancelQueries({
        queryKey: catalogQueryKey(browseFilters(from.type, from.q)),
        exact: true,
      })
      if (request !== revision.current) return
      const next = catalogQueryKey(browseFilters(nextType, nextQ))
      await client.cancelQueries({ queryKey: next, exact: true })
      if (request !== revision.current) return
      client.removeQueries({ queryKey: next, exact: true })
      try {
        await navigate({
          to: '/',
          search: browseSearch(nextType, nextQ),
          replace: nextType === from.type,
        })
      } finally {
        if (request === revision.current) setSwitching(false)
      }
    },
    [client, navigate],
  )
  apply.current = async (value) => {
    const next = normalizeQuery(value)
    if (next !== committed.current) await go(current.current.type, next)
  }
  // External URL changes (Back/Forward, links) replace the draft; our own
  // commits already match `committed` and must not overwrite later typing.
  useEffect(() => {
    if (q === committed.current) return
    committed.current = q
    debounce.cancel()
    setDraft(q)
  }, [q, debounce])
  useEffect(() => debounce.cancel, [debounce])
  const schedule = (value: string) => {
    if (!composing.current)
      debounce.search({ ...defaultCatalogFilters, search: value })
  }
  return {
    draft,
    // Typing, debounce wait or an in-flight navigation for new filters.
    pending: normalizeQuery(draft) !== q || switching,
    // The destination filters are loading; show skeletons instead of old cards.
    switching,
    onChange(value: string) {
      const bounded = [...value].slice(0, searchMaxLength).join('')
      setDraft(bounded)
      schedule(bounded)
    },
    onCompositionStart() {
      composing.current = true
      debounce.cancel()
    },
    onCompositionEnd(value: string) {
      composing.current = false
      schedule(value)
    },
    clear() {
      debounce.cancel()
      composing.current = false
      setDraft('')
      if (committed.current !== '') void go(current.current.type, '')
    },
    changeType(next: CatalogType) {
      if (next === current.current.type) return
      debounce.cancel()
      void go(next, normalizeQuery(draft))
    },
  }
}
