import {
  DashboardMedia,
  DashboardAttention,
} from '#/components/admin/dashboard-media'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useDashboardSummary } from '#/hooks/use-dashboard-summary'
import {
  DashboardContent,
  DashboardLatest,
  DashboardSkeleton,
} from '#/components/admin/dashboard-content'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { useAdminPrincipal } from '#/hooks/use-admin-principal'
import { AdminPageHeading } from '#/components/admin/page-heading'
import { Button } from '#/components/ui/button'
import { contentSearch } from '#/lib/admin/content-list-state'

export const Route = createFileRoute('/admin/_authenticated/')({
  head: () => ({
    meta: [
      { title: 'Dashboard · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AdminDashboard,
})
function AdminDashboard() {
  const { user, session } = useAdminPrincipal()
  const { query, online, refresh } = useDashboardSummary()
  const data = query.data
  return (
    <>
      <AdminPageHeading
        title="Dashboard"
        description="Your editorial inventory and current media jobs."
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button
          nativeButton={false}
          className="min-h-11"
          render={<Link to="/admin/content/new" />}
        >
          Add a video
        </Button>
        <Button
          nativeButton={false}
          className="min-h-11"
          variant="outline"
          render={<Link to="/admin/content" search={contentSearch({})} />}
        >
          View content
        </Button>
        <Button
          className="min-h-11"
          variant="outline"
          disabled={!online || query.isFetching}
          onClick={refresh}
        >
          {query.isFetching
            ? 'Refreshing…'
            : query.isError
              ? 'Retry'
              : 'Refresh'}
        </Button>
      </div>
      <div
        className="mb-6 space-y-6"
        data-testid="dashboard-summary"
        aria-busy={query.isFetching}
      >
        <p
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {data ? (
            <>
              {!online || query.isError
                ? 'Stale data · '
                : query.isFetching
                  ? 'Refreshing · '
                  : ''}
              Last updated{' '}
              <time dateTime={data.generatedAt}>
                {new Date(data.generatedAt)
                  .toISOString()
                  .replace('T', ' ')
                  .slice(0, 19)}{' '}
                UTC
              </time>
            </>
          ) : online ? (
            'Waiting for dashboard data.'
          ) : (
            'Offline · Dashboard data is unavailable.'
          )}
        </p>
        {query.isError && (
          <Alert variant="destructive">
            <AlertTitle>Dashboard could not be refreshed</AlertTitle>
            <AlertDescription>
              {data
                ? 'Showing the last successful snapshot.'
                : 'Dashboard data is unavailable.'}{' '}
              Use Retry when connected.
            </AlertDescription>
          </Alert>
        )}
        {!online && (
          <Alert>
            <AlertTitle>You are offline</AlertTitle>
            <AlertDescription>
              {data
                ? 'Showing the last successful snapshot.'
                : 'Connect to load your dashboard.'}
            </AlertDescription>
          </Alert>
        )}
        {data ? (
          <>
            <DashboardContent data={data} />
            <DashboardMedia data={data} />
            <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
              <DashboardAttention data={data} />
              <DashboardLatest data={data} />
            </div>
          </>
        ) : query.isPending && online ? (
          <DashboardSkeleton />
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Administrator account</h2>
          </CardTitle>
          <CardDescription>Your current account and session.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            {[
              { label: 'Name', value: user.name },
              { label: 'Email', value: user.email },
              { label: 'Role', value: 'Administrator' },
            ].map((row) => (
              <div key={row.label} className="space-y-1">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="break-words font-medium">{row.value}</dd>
              </div>
            ))}
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Session</dt>
              <dd>
                <Badge variant="secondary">Active</Badge>
              </dd>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-sm text-muted-foreground">
                Session expires (UTC)
              </dt>
              <dd className="text-sm">
                <time dateTime={session.expiresAt}>{session.expiresAt}</time>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </>
  )
}
