'use client'

import '../styles/base.css'
import '../styles/audio/theme.css'
import '../styles/video/captions.css'
import '../styles/video/theme.css'
import { PlayButton as PlayButtonPrimitive } from '@videojs/react'
import {
  RiRestartLine as RestartIconPrimitive,
  RiPlayFill as PlayIconPrimitive,
  RiPauseFill as PauseIconPrimitive,
} from '@remixicon/react'

import { Button } from '@/components/videojs/ui/button'
import { resolveClassName } from '@/lib/resolve-class-name'
import { cn } from '@/lib/utils'

export type PlayButtonProps = Omit<PlayButtonPrimitive.Props, 'children'>

export function PlayButton({ className, ...props }: PlayButtonProps = {}) {
  return (
    <PlayButtonPrimitive
      render={<Button />}
      className={(state) =>
        cn('group/play', resolveClassName(className, state))
      }
      {...props}
    >
      <RestartIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'scale-media-hidden-icon opacity-0 group-data-ended/play:scale-100 group-data-ended/play:opacity-100',
        )}
      />
      <PlayIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'scale-media-hidden-icon opacity-0',
          'group-not-data-ended/play:group-data-paused/play:opacity-100',
          'group-not-data-ended/play:group-data-paused/play:scale-100',
          'group-not-data-ended/play:group-not-data-started/play:opacity-100',
          'group-not-data-ended/play:group-not-data-started/play:scale-100',
        )}
      />
      <PauseIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'scale-media-hidden-icon opacity-0',
          'group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:opacity-100',
          'group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:scale-100',
        )}
      />
    </PlayButtonPrimitive>
  )
}
