import {
  RiBroadcastLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiFilmLine,
  RiImageAddLine,
  RiLoader4Line,
  RiUploadCloud2Line,
  RiVideoAddLine,
} from '@remixicon/react'
import type { ComponentType } from 'react'
import { readiness } from '#/lib/admin/content-readiness'
import type {
  ReadinessIcon,
  ReadinessTone,
} from '#/lib/admin/content-readiness'
import type { ContentItem } from '#/lib/admin/content-client'

const icons: Record<ReadinessIcon, ComponentType<{ className?: string }>> = {
  live: RiBroadcastLine,
  ready: RiCheckboxCircleLine,
  processing: RiLoader4Line,
  uploading: RiUploadCloud2Line,
  video: RiVideoAddLine,
  cover: RiImageAddLine,
  failed: RiErrorWarningLine,
  episodes: RiFilmLine,
}
const tones: Record<ReadinessTone, string> = {
  good: 'text-emerald-700 dark:text-emerald-400',
  info: 'text-sky-700 dark:text-sky-400',
  warn: 'text-amber-700 dark:text-amber-400',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
}

/** Icon and text, so the state never relies on colour alone. */
export function ContentReadiness({ item }: { item: ContentItem }) {
  const state = readiness(item)
  if (!state)
    return (
      <span className="text-muted-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not applicable</span>
      </span>
    )
  const Icon = icons[state.icon]
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium ${tones[state.tone]}`}
      title={state.hint}
    >
      <Icon
        className={`size-4 shrink-0 ${state.icon === 'processing' ? 'animate-spin motion-reduce:animate-none' : ''}`}
        aria-hidden="true"
      />
      {state.label}
    </span>
  )
}
