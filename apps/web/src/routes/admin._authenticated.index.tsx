import { createFileRoute } from '@tanstack/react-router'
import { RiFilmLine } from '@remixicon/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { useAdminPrincipal } from '#/lib/auth/session-context'
import { AdminPageHeading } from '#/components/admin/page-heading'

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
  return (
    <>
      <AdminPageHeading
        title="Dashboard"
        description="Manage your content metadata in one place."
      />
      <Card className="mb-6 bg-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <RiFilmLine className="size-7" aria-hidden="true" />
            Welcome back, {user.name}
          </CardTitle>
          <CardDescription>Start with a well-organized draft.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Create and manage films, standalone videos, and series before
            uploading.
          </p>
        </CardContent>
      </Card>
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
