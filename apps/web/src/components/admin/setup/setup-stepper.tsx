import { Link } from '@tanstack/react-router'
import { RiCheckLine } from '@remixicon/react'
import type { SetupStep, SetupType } from '#/lib/admin/setup-flow'
import type { OwnerMedia } from '#/lib/admin/media-client'
import { setupSteps } from '#/lib/admin/setup-flow'

export function SetupStepper({
  type,
  id,
  current,
  media,
}: {
  type: SetupType
  id: string
  current: SetupStep
  media?: OwnerMedia
}) {
  const steps = setupSteps(current, media)
  return (
    <ol
      aria-label="Progress"
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      {steps.map((step, index) => {
        const number = index + 1
        const marker = (
          <span
            aria-hidden="true"
            className={
              'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ' +
              (step.state === 'current'
                ? 'bg-primary text-primary-foreground'
                : step.state === 'done'
                  ? 'bg-primary/20 text-primary-foreground'
                  : 'border border-input text-muted-foreground')
            }
          >
            {step.state === 'done' ? (
              <RiCheckLine className="size-4" />
            ) : (
              number
            )}
          </span>
        )
        const label = (
          <span
            className={
              step.state === 'current'
                ? 'font-semibold'
                : step.state === 'done'
                  ? ''
                  : 'text-muted-foreground'
            }
          >
            {step.label}
            <span className="sr-only">
              {step.state === 'done'
                ? ' (completed)'
                : step.state === 'current'
                  ? ' (current step)'
                  : ''}
            </span>
          </span>
        )
        const content = (
          <span className="flex min-h-11 items-center gap-2 text-sm">
            {marker}
            {label}
          </span>
        )
        return (
          <li
            key={step.id}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="flex items-center gap-3"
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className={
                  'hidden h-0.5 w-8 sm:block ' +
                  (step.state === 'todo' ? 'bg-border' : 'bg-primary')
                }
              />
            )}
            {step.id === 'details' ? (
              <Link
                to="/admin/content/$type/$id/edit"
                params={{ type, id }}
                className="rounded-xl outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {content}
              </Link>
            ) : step.enabled && step.state !== 'current' ? (
              <Link
                to="/admin/content/$type/$id/setup"
                params={{ type, id }}
                search={{ step: step.id }}
                className="rounded-xl outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ol>
  )
}
