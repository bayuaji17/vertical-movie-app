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
import type { DashboardSummary } from '#/lib/admin/dashboard-client'

export function DashboardMedia({ data }: { data: DashboardSummary }) {
  return (
    <section aria-labelledby="media-jobs-title" className="space-y-4">
      <div>
        <h2
          id="media-jobs-title"
          className="font-heading text-xl font-semibold"
        >
          Current media jobs
        </h2>
        <p className="text-sm text-muted-foreground">
          Counts refer to current source and cover jobs, not content items.
          Running reflects the last recorded job state.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['queued', 'running', 'retry', 'failed'] as const).map((state) => (
          <Card key={state} data-testid={`dashboard-job-${state}`}>
            <CardHeader>
              <CardTitle>
                <h3 className="capitalize">{state}</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`break-all font-heading text-3xl font-semibold tabular-nums ${state === 'failed' && data.media.failed ? 'text-destructive' : ''}`}
                aria-label={`${state} jobs ${data.media[state]}`}
              >
                {new Intl.NumberFormat('en-US').format(data.media[state])}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
export function DashboardAttention({ data }: { data: DashboardSummary }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          <h2>Needs attention</h2>
        </CardTitle>
        <CardDescription>
          The five most recently updated current failed jobs. Open the content
          to review its media.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.failedMedia.length ? (
          <ul className="divide-y" data-testid="dashboard-failures">
            {data.failedMedia.map((row) => (
              <li key={row.jobId} className="space-y-2 py-3">
                <p className="break-all font-medium">{row.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {row.type}
                  </Badge>
                  <Badge variant="secondary">
                    {row.role === 'source' ? 'Source' : 'Cover'}
                  </Badge>
                </div>
                {row.type === 'episode' && row.seriesId ? (
                  <Link
                    to="/admin/series/$seriesId/episodes/$episodeId"
                    params={{ seriesId: row.seriesId, episodeId: row.id }}
                    className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    Open content<span className="sr-only">: {row.title}</span>
                  </Link>
                ) : row.type !== 'episode' ? (
                  <Link
                    to="/admin/content/$type/$id"
                    params={{ type: row.type, id: row.id }}
                    className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    Open content<span className="sr-only">: {row.title}</span>
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty className="p-6">
            <EmptyHeader>
              <EmptyTitle>No current failed media jobs</EmptyTitle>
              <EmptyDescription>
                Current source and cover jobs have no recorded failures.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
