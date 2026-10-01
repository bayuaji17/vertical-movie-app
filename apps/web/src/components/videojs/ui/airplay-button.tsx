'use client'

import '../styles/base.css'
import '../styles/audio/theme.css'
import '../styles/video/captions.css'
import '../styles/video/theme.css'
import { AirPlayButton as AirPlayButtonPrimitive } from '@videojs/react'
import {
  RiAirplayLine as AirPlayEnterIconPrimitive,
  RiAirplayFill as AirPlayExitIconPrimitive,
} from '@remixicon/react'

import { Button } from '@/components/videojs/ui/button'
import { resolveClassName } from '@/lib/resolve-class-name'
import { cn } from '@/lib/utils'

export type AirPlayButtonProps = Omit<AirPlayButtonPrimitive.Props, 'children'>

export function AirPlayButton({
  className,
  ...props
}: AirPlayButtonProps = {}) {
  return (
    <AirPlayButtonPrimitive
      render={<Button />}
      className={(state) =>
        cn(
          'group/airplay',
          'not-data-[airplay-state=connected]:[--media-icon-airplay-fill-animation:none]',
          'not-data-[airplay-state=connected]:[--media-icon-airplay-triangle-animation:none]',
          resolveClassName(className, state),
        )
      }
      {...props}
    >
      <AirPlayEnterIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'opacity-0 group-not-data-[airplay-state=connected]/airplay:scale-100',
          'group-not-data-[airplay-state=connected]/airplay:opacity-100',
        )}
      />
      <AirPlayExitIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'opacity-0 group-data-[airplay-state=connected]/airplay:scale-100',
          'group-data-[airplay-state=connected]/airplay:opacity-100',
        )}
      />
    </AirPlayButtonPrimitive>
  )
}
