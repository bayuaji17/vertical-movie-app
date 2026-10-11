import { Link } from '@tanstack/react-router'
import { RiArrowLeftLine } from '@remixicon/react'
import { cn } from 'cn'
import type { ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { useBrowseBack } from '#/hooks/use-browse-back'
import { useTextClamp } from '#/hooks/use-text-clamp'

// Shared by Film/Standalone and Series detail: poster beside the title on
// mobile, poster column on the left from 1024 px (see docs/design/watch-flow.md).
export const detailLayout =
  'grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-x-12 lg:gap-y-5'
export const detailHeader =
  'grid grid-cols-[132px_minmax(0,1fr)] items-end gap-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-7 lg:contents'
// The poster spans a fourth flexible row so its height never stretches the text rows.
export const detailPosterSlot = 'lg:col-start-1 lg:row-span-4 lg:row-start-1'
export const detailTitleSlot =
  'flex min-w-0 flex-col gap-2.5 lg:col-start-2 lg:row-start-1'

export function BackToBrowse() {
  const back = useBrowseBack()
  return (
    <Link
      to="/"
      preload={false}
      onClick={back}
      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      <RiArrowLeftLine className="size-4" aria-hidden="true" />
      Back to browse
    </Link>
  )
}
export function DetailTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-heading text-3xl leading-tight font-bold [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl">
      {children}
    </h1>
  )
}
export function DetailSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className={detailLayout}>
      <div className={detailHeader}>
        <Skeleton
          className={cn('aspect-[9/16] w-full rounded-2xl', detailPosterSlot)}
        />
        <div className={detailTitleSlot}>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10 w-full lg:h-14" />
        </div>
      </div>
      <Skeleton className="h-24 w-full lg:col-start-2 lg:row-start-2" />
    </div>
  )
}
/** Collapsed text with "Read more" on phones; the control only shows when text overflows. */
export function ClampedText({
  text,
  clampClass = 'line-clamp-4',
}: {
  text: string
  clampClass?: string
}) {
  const clamp = useTextClamp()
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <p
        ref={clamp.ref}
        className={cn(
          'max-w-2xl text-base leading-relaxed whitespace-pre-line text-muted-foreground [overflow-wrap:anywhere]',
          !clamp.expanded && clampClass,
        )}
      >
        {text}
      </p>
      {(clamp.overflowing || clamp.expanded) && (
        <Button
          variant="ghost"
          className="-ml-3 min-h-11 lg:hidden"
          aria-expanded={clamp.expanded}
          onClick={clamp.toggle}
        >
          {clamp.expanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </div>
  )
}
export function DetailSynopsis({ text }: { text: string }) {
  return (
    <div className="min-w-0 lg:col-start-2 lg:row-start-2">
      <ClampedText text={text} clampClass="line-clamp-4 lg:line-clamp-none" />
    </div>
  )
}
/** Sticky at the bottom of the viewport on phones, inline from 640 px. */
export function DetailCta({ children }: { children: ReactNode }) {
  return (
    <div
      data-sticky-cta
      className="sticky bottom-0 z-10 -mx-4 border-t bg-background/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none lg:col-start-2 lg:row-start-3"
    >
      {children}
    </div>
  )
}
