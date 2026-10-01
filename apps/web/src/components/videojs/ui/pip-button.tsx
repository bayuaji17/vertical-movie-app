'use client'

import '../styles/base.css'
import '../styles/audio/theme.css'
import '../styles/video/captions.css'
import '../styles/video/theme.css'
import { PiPButton as PiPButtonPrimitive } from '@videojs/react'
import {
  RiPictureInPicture2Line as PipEnterIconPrimitive,
  RiPictureInPictureExitLine as PipExitIconPrimitive,
} from '@remixicon/react'

import { Button } from '@/components/videojs/ui/button'
import { resolveClassName } from '@/lib/resolve-class-name'
import { cn } from '@/lib/utils'

export type PiPButtonProps = Omit<PiPButtonPrimitive.Props, 'children'>

export function PiPButton({ className, ...props }: PiPButtonProps = {}) {
  return (
    <PiPButtonPrimitive
      render={<Button />}
      className={(state) => cn('group/pip', resolveClassName(className, state))}
      {...props}
    >
      <PipEnterIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'opacity-0 group-not-data-pip/pip:scale-100 group-not-data-pip/pip:opacity-100',
        )}
      />
      <PipExitIconPrimitive
        aria-hidden="true"
        className={cn(
          'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon [text-shadow:inherit]',
          'transition-[opacity,scale] duration-media-base ease-out',
          'opacity-0 group-data-pip/pip:scale-100 group-data-pip/pip:opacity-100',
        )}
      />
    </PiPButtonPrimitive>
  )
}
