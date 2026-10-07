import { useRef, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { catalogData } from '#/lib/catalog/catalog-data'
import {
  catalogInfiniteOptions,
  createCatalogTransition,
} from '#/lib/catalog/catalog-queries'
import { defaultCatalogFilters } from '#/lib/catalog/catalog-selectors'
import type { CatalogFilters as Filters } from '#/lib/catalog/catalog-selectors'
import type { CatalogItem } from '#/lib/catalog/catalog-schema'
import { PublicShell } from './public-shell'
import { FeaturedFilm } from './featured-film'
import { CatalogSearch, CatalogFilters } from './catalog-filters'
import { CatalogGrid } from './catalog-grid'
import { CatalogDetailDialog } from './catalog-detail-dialog'

export function HomePage() {
  const client = useQueryClient()
  const [filters, setFilters] = useState(defaultCatalogFilters)
  const [draft, setDraft] = useState(defaultCatalogFilters)
  const draftRef = useRef(draft)
  const [transition] = useState(() =>
    createCatalogTransition(client, setFilters),
  )
  const [selection, setSelection] = useState<{
    item: CatalogItem
    trigger: HTMLElement
  } | null>(null)
  const query = useInfiniteQuery(catalogInfiniteOptions(filters))
  function change(next: Filters, force = false) {
    draftRef.current = next
    setDraft(next)
    void transition(next, force)
  }
  function reset(focusSearch = false) {
    change(defaultCatalogFilters, true)
    if (focusSearch) document.getElementById('catalog-search')?.focus()
  }
  function details(item: CatalogItem, trigger: HTMLElement) {
    setSelection({ item, trigger })
  }
  function browse() {
    const section = document.getElementById('catalog')
    section?.scrollIntoView({ behavior: 'auto', block: 'start' })
    section?.focus({ preventScroll: true })
  }
  const featured = catalogData.items.find(
    (item) => item.id === catalogData.featuredId,
  )!
  const items = query.data.pages.flatMap((page) => page.items)
  const showFeatured =
    !filters.search && filters.kind === 'all' && filters.genreId === 'all'
  return (
    <PublicShell
      search={
        <CatalogSearch
          value={draft.search}
          onChange={(search) => change({ ...draftRef.current, search })}
        />
      }
      onHome={() => {
        reset()
        window.scrollTo({ top: 0, behavior: 'auto' })
      }}
      onBrowse={browse}
    >
      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-[0.35em] text-muted-foreground">
          STORIES IN PORTRAIT
        </p>
        <h1 className="font-heading text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Find your next story.
        </h1>
        <p className="text-base text-muted-foreground lg:text-lg">
          Films, series, and short stories. Watch without an account.
        </p>
      </section>
      {showFeatured && <FeaturedFilm item={featured} onDetails={details} />}
      <section
        id="catalog"
        tabIndex={-1}
        aria-labelledby="catalog-heading"
        className="flex min-w-0 scroll-mt-6 flex-col gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div>
          <h2
            id="catalog-heading"
            className="font-heading text-2xl font-bold tracking-tight"
          >
            Browse the catalog
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore films, series, and standalone videos.
          </p>
        </div>
        <CatalogFilters filters={draft} onChange={change} />
        <CatalogGrid
          items={items}
          total={query.data.pages[0].total}
          hasNextPage={query.hasNextPage}
          busy={query.isFetchingNextPage}
          onLoadMore={() => {
            if (query.hasNextPage && !query.isFetching)
              void query.fetchNextPage({ cancelRefetch: false })
          }}
          onReset={() => reset(true)}
          onDetails={details}
        />
      </section>
      <CatalogDetailDialog
        item={selection?.item ?? null}
        trigger={selection?.trigger ?? null}
        onClose={() => setSelection(null)}
      />
    </PublicShell>
  )
}
