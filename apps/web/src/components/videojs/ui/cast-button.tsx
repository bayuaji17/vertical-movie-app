'use client'

import '../styles/base.css'
import '../styles/audio/theme.css'
import '../styles/video/captions.css'
import '../styles/video/theme.css'
import { CastButton as CastButtonPrimitive } from '@videojs/react'
import {
  RiCastLine as CastEnterIconPrimitive,
  RiCastFill as CastExitIconPrimitive,
} from '@remixicon/react'

import { Button } from '@/components/videojs/ui/button'
import { resolveClassName } from '@/lib/resolve-class-name'
import { cn } from '@/lib/utils'

export type CastButtonProps = Omit<CastButtonPrimitive.Props, 'children'>

export function CastButton({ className, ...props }: CastButtonProps = {}) {
  return (
    <CastButtonPrimitive
      render={<Button />}
      className={(state) =>
        cn('group/cast', resolveClassName(className, state))
      }
      {...props}
    >
      <CastEnterIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'opacity-0 group-not-data-[cast-state=connected]/cast:scale-100',
          'group-not-data-[cast-state=connected]/cast:opacity-100',
        )}
      />
      <CastExitIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'opacity-0 group-data-[cast-state=connected]/cast:scale-100',
          'group-data-[cast-state=connected]/cast:opacity-100',
        )}
      />
    </CastButtonPrimitive>
  )
}
