'use client'

import '../styles/base.css'
import '../styles/audio/theme.css'
import '../styles/video/captions.css'
import '../styles/video/theme.css'
import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/react'
import {
  RiFullscreenLine as FullscreenEnterIconPrimitive,
  RiFullscreenExitLine as FullscreenExitIconPrimitive,
} from '@remixicon/react'

import { Button } from '@/components/videojs/ui/button'
import { resolveClassName } from '@/lib/resolve-class-name'
import { cn } from '@/lib/utils'

export type FullscreenButtonProps = Omit<
  FullscreenButtonPrimitive.Props,
  'children'
>

export function FullscreenButton({
  className,
  ...props
}: FullscreenButtonProps = {}) {
  return (
    <FullscreenButtonPrimitive
      render={<Button />}
      className={(state) =>
        cn('group/fullscreen', resolveClassName(className, state))
      }
      {...props}
    >
      <FullscreenEnterIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'opacity-0 group-not-data-fullscreen/fullscreen:scale-100 group-not-data-fullscreen/fullscreen:opacity-100',
        )}
      />
      <FullscreenExitIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'opacity-0 group-data-fullscreen/fullscreen:scale-100 group-data-fullscreen/fullscreen:opacity-100',
        )}
      />
    </FullscreenButtonPrimitive>
  )
}
