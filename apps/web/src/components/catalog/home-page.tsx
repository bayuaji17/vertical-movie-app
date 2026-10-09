import { useSiteSettings } from '#/hooks/use-site-settings'
import { useEffect, useRef, useState } from 'react'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  catalogInfiniteOptions,
  catalogQueryKey,
  catalogGenresOptions,
  catalogFeaturedOptions,
  createCatalogTransition,
  createCatalogDebounce,
} from '#/lib/catalog/catalog-queries'
import {
  defaultCatalogFilters,
  sameFilters,
  itemIdentity,
} from '#/lib/catalog/public-catalog-model'
import type {
  CatalogFilters as Filters,
  CatalogItem,
} from '#/lib/catalog/public-catalog-model'
import type { CatalogBootstrap } from '#/lib/catalog/public-catalog-queries'
import { CatalogRequestError } from '#/lib/catalog/catalog-client'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { PublicShell } from './public-shell'
import { FeaturedFilm } from './featured-film'
import { CatalogSearch, CatalogFilters } from './catalog-filters'
import { CatalogGrid } from './catalog-grid'
import { CatalogDetailDialog } from './catalog-detail-dialog'

function SectionFailure({
  label,
  onRetry,
  busy,
}: {
  label: string
  onRetry: () => void
  busy: boolean
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
    >
      <p className="text-sm text-muted-foreground">
        {label} is temporarily unavailable.
      </p>
      <Button
        variant="outline"
        className="min-h-11"
        disabled={busy}
        onClick={onRetry}
      >
        Retry {label.toLowerCase()}
      </Button>
    </div>
  )
}
export function HomePage({ bootstrap }: { bootstrap: CatalogBootstrap }) {
  const { settings } = useSiteSettings()
  const client = useQueryClient()
  const [filters, setFilters] = useState(defaultCatalogFilters),
    [draft, setDraft] = useState(defaultCatalogFilters)
  const draftRef = useRef(draft),
    composing = useRef(false)
  const [transition] = useState(() =>
    createCatalogTransition(client, setFilters),
  )
  const [debounce] = useState(() => createCatalogDebounce(transition))
  useEffect(
    () => () => {
      debounce.cancel()
      transition.dispose()
    },
    [debounce, transition],
  )
  const [selection, setSelection] = useState<{
    item: CatalogItem
    trigger: HTMLElement
  } | null>(null)
  const defaultView = sameFilters(filters, defaultCatalogFilters)
  // Failed SSR reads have no fake page. Manual retry succeeds before observers are enabled again.
  const query = useInfiniteQuery({
    ...catalogInfiniteOptions(filters),
    enabled:
      !defaultView ||
      !bootstrap.catalogFailed ||
      !!client.getQueryData(catalogQueryKey(filters)),
  })
  const genresOptions = catalogGenresOptions(),
    featuredOptions = catalogFeaturedOptions()
  const genres = useQuery({
    ...genresOptions,
    enabled:
      !bootstrap.genresFailed || !!client.getQueryData(genresOptions.queryKey),
  })
  const featured = useQuery({
    ...featuredOptions,
    enabled:
      defaultView &&
      (!bootstrap.featuredFailed ||
        !!client.getQueryData(featuredOptions.queryKey)),
  })
  function change(next: Filters, immediate = true) {
    const bounded = { ...next, search: [...next.search].slice(0, 200).join('') }
    draftRef.current = bounded
    setDraft(bounded)
    if (immediate) void debounce.immediate(bounded)
    else if (!composing.current) debounce.search(bounded)
  }
  function reset(focus = false) {
    composing.current = false
    draftRef.current = defaultCatalogFilters
    setDraft(defaultCatalogFilters)
    setSelection(null)
    void debounce.immediate(defaultCatalogFilters, true)
    if (focus) document.getElementById('catalog-search')?.focus()
  }
  function details(item: CatalogItem, trigger: HTMLElement) {
    setSelection({ item, trigger })
  }
  function browse() {
    const section = document.getElementById('catalog')
    section?.scrollIntoView({ behavior: 'auto', block: 'start' })
    section?.focus({ preventScroll: true })
  }
  const items = [
    ...new Map(
      query.data?.pages
        .flatMap((p) => p.items)
        .map((item) => [itemIdentity(item), item]) ?? [],
    ).values(),
  ]
  const total = query.data?.pages.at(-1)?.total ?? 0
  const initialError =
    !query.data &&
    (query.isError ||
      (defaultView &&
        bootstrap.catalogFailed &&
        query.fetchStatus !== 'fetching'))
  const cursorInvalid =
    query.isFetchNextPageError &&
    query.error instanceof CatalogRequestError &&
    query.error.status === 422
  function refresh() {
    if (cursorInvalid) void debounce.immediate(filters, true)
    else void query.refetch({ cancelRefetch: false })
    void genres.refetch({ cancelRefetch: false })
    if (defaultView) void featured.refetch({ cancelRefetch: false })
  }
  return (
    <PublicShell
      search={
        <CatalogSearch
          value={draft.search}
          onChange={(search) => change({ ...draftRef.current, search }, false)}
          onCompositionStart={() => {
            composing.current = true
            debounce.cancel()
          }}
          onCompositionEnd={(search) => {
            composing.current = false
            change({ ...draftRef.current, search }, false)
          }}
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
        {settings.tagline && (
          <h1 className="font-heading text-4xl leading-[1.08] font-bold tracking-tight [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">
            {settings.tagline}
          </h1>
        )}
        {settings.description && (
          <p className="text-base text-muted-foreground [overflow-wrap:anywhere] lg:text-lg">
            {settings.description}
          </p>
        )}
      </section>
      {defaultView &&
        (featured.data?.item ? (
          <FeaturedFilm item={featured.data.item} onDetails={details} />
        ) : featured.isFetching ? (
          <Skeleton
            aria-label="Loading featured film"
            className="h-64 rounded-3xl motion-reduce:animate-none"
          />
        ) : (featured.isError || bootstrap.featuredFailed) && !featured.data ? (
          <SectionFailure
            label="Featured film"
            busy={featured.isFetching}
            onRetry={() => {
              void featured.refetch()
            }}
          />
        ) : null)}
      <section
        id="catalog"
        tabIndex={-1}
        aria-labelledby="catalog-heading"
        className="flex min-w-0 scroll-mt-6 flex-col gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {defaultView && featured.isError && featured.data && (
          <SectionFailure
            label="Featured film"
            busy={featured.isFetching}
            onRetry={() => {
              void featured.refetch()
            }}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <Button
            variant="outline"
            className="min-h-11"
            disabled={query.isFetching || query.fetchStatus === 'paused'}
            onClick={refresh}
          >
            Refresh catalog
          </Button>
        </div>
        <CatalogFilters
          filters={draft}
          onChange={(next) => change(next)}
          genres={genres.data?.items ?? []}
        />
        {(genres.isError || (bootstrap.genresFailed && !genres.data)) && (
          <SectionFailure
            label="Genres"
            busy={genres.isFetching}
            onRetry={() => {
              void genres.refetch()
            }}
          />
        )}
        {genres.isPending && !bootstrap.genresFailed && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading genres…
          </p>
        )}
        <CatalogGrid
          items={items}
          total={total}
          hasNextPage={query.hasNextPage}
          busy={query.isFetchingNextPage}
          blocked={query.isFetching || query.fetchStatus === 'paused'}
          initialPending={!query.data && !initialError}
          initialError={initialError}
          nextPageError={query.isFetchNextPageError}
          refreshError={
            !!query.data && query.isError && !query.isFetchNextPageError
          }
          refreshing={
            query.isFetching && !query.isFetchingNextPage && !!query.data
          }
          paused={query.fetchStatus === 'paused'}
          cursorInvalid={cursorInvalid}
          onLoadMore={() => {
            if (query.hasNextPage && !query.isFetching)
              void query.fetchNextPage({ cancelRefetch: false })
          }}
          onRetry={() => {
            void query.refetch({ cancelRefetch: false })
          }}
          onRefresh={refresh}
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
