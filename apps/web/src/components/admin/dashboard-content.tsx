import { contentSearch } from '#/lib/admin/content-list-state'
import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import type { DashboardSummary } from '#/lib/admin/dashboard-client'

const labels = {
  film: 'Film',
  standalone: 'Standalone',
  series: 'Series',
  episode: 'Episode',
}
const number = new Intl.NumberFormat('en-US')
export function DashboardContent({ data }: { data: DashboardSummary }) {
  return (
    <section aria-labelledby="content-overview-title" className="space-y-4">
      <div>
        <h2
          id="content-overview-title"
          className="font-heading text-xl font-semibold"
        >
          Content inventory
        </h2>
        <p className="text-sm text-muted-foreground">
          Published is an editorial status. Episodes may remain hidden until
          their series is published. Archiving a parent does not change each
          episode's status.
        </p>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['film', 'standalone', 'series', 'episode'] as const).map((type) => {
          const counts = data.content[type]
          return (
            <Card
              key={type}
              data-testid={`dashboard-count-${type}`}
              className="min-w-0"
            >
              <CardHeader>
                <CardTitle>
                  <h3>{labels[type]}</h3>
                </CardTitle>
                <CardDescription>
                  All{' '}
                  {type === 'episode'
                    ? 'episodes'
                    : labels[type].toLowerCase() + ' content'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p
                  className="break-all font-heading text-3xl font-semibold tabular-nums"
                  aria-label={`${labels[type]} total ${counts.total}`}
                >
                  {number.format(counts.total)}
                </p>
                <dl className="space-y-2 text-sm">
                  {(
                    [
                      'draft',
                      'published',
                      'archived',
                      ...(type === 'series' && counts.unpublished > 0
                        ? ['unpublished' as const]
                        : []),
                    ] as const
                  ).map((status) => (
                    <div key={status} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground capitalize">
                        {status === 'unpublished'
                          ? 'Unpublished (legacy)'
                          : status}
                      </dt>
                      <dd className="break-all text-right tabular-nums">
                        {number.format(counts[status])}
                      </dd>
                    </div>
                  ))}
                </dl>
                {type === 'episode' ? (
                  <p className="text-sm text-muted-foreground">
                    Manage episodes from a series.
                  </p>
                ) : (
                  <Link
                    to="/admin/content"
                    search={contentSearch({ type })}
                    className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    View{' '}
                    {type === 'film'
                      ? 'films'
                      : type === 'standalone'
                        ? 'standalone'
                        : 'series'}
                  </Link>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <Card key={n}>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-52 w-full" />
    </div>
  )
}

export function DashboardLatest({ data }: { data: DashboardSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Latest created</h2>
        </CardTitle>
        <CardDescription>
          The eight newest active films, standalone videos and series.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.latestContent.length ? (
          <ul className="divide-y" data-testid="dashboard-latest">
            {data.latestContent.map((row) => (
              <li
                key={`${row.type}:${row.id}`}
                className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <Link
                    to="/admin/content/$type/$id"
                    params={{ type: row.type, id: row.id }}
                    className="inline-flex min-h-11 max-w-full items-center break-all font-medium underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {row.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {labels[row.type]} · Created{' '}
                    <time dateTime={row.createdAt}>
                      {new Date(row.createdAt)
                        .toISOString()
                        .replace('T', ' ')
                        .slice(0, 19)}{' '}
                      UTC
                    </time>
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="w-fit shrink-0 capitalize"
                >
                  {row.publicationStatus}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <Empty className="p-6">
            <EmptyHeader>
              <EmptyTitle>No content yet</EmptyTitle>
              <EmptyDescription>
                Create a draft to start your content library.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
