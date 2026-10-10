import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import type { ContentItem } from '#/lib/admin/content-client'
import { nextStep } from '#/lib/admin/next-step'
import { seasonsHref } from '#/lib/admin/series-form-state'

// One clear action per row: continue the draft, or view what is already live.
export function ContentNextStep({ item }: { item: ContentItem }) {
  const step = nextStep(item)
  const label = (
    <>
      {step.label}
      <span className="sr-only"> {item.title}</span>
    </>
  )
  return (
    <div className="flex flex-wrap items-center gap-2">
      {step.kind === 'setup' &&
      (item.type === 'film' || item.type === 'standalone') ? (
        <Button
          className="min-h-11"
          nativeButton={false}
          render={
            <Link
              to="/admin/content/$type/$id/setup"
              params={{ type: item.type, id: item.id }}
              search={{ step: undefined }}
            />
          }
        >
          {label}
        </Button>
      ) : step.kind === 'seasons' ? (
        <Button
          className="min-h-11"
          nativeButton={false}
          render={<Link to={seasonsHref(item.id)} />}
        >
          {label}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="min-h-11"
          nativeButton={false}
          render={
            <Link
              to="/admin/content/$type/$id"
              params={{ type: item.type, id: item.id }}
            />
          }
        >
          {label}
        </Button>
      )}
      {step.primary && (
        <Button
          variant="ghost"
          className="min-h-11"
          nativeButton={false}
          render={
            <Link
              to="/admin/content/$type/$id"
              params={{ type: item.type, id: item.id }}
            />
          }
        >
          Details<span className="sr-only"> {item.title}</span>
        </Button>
      )}
    </div>
  )
}
