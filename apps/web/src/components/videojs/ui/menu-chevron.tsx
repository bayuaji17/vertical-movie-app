import { RiArrowRightSLine as ChevronIconPrimitive } from '@remixicon/react'
import type { ClassValue } from 'cn'

import { cn } from '@/lib/utils'

export interface MenuChevronProps {
  back?: boolean
  className?: ClassValue
}

export function MenuChevron({
  back = false,
  className,
}: MenuChevronProps = {}) {
  return (
    <ChevronIconPrimitive
      aria-hidden="true"
      className={cn(
        back
          ? 'shrink-0 drop-shadow-media-icon text-media-muted-foreground size-media-icon-sm rotate-180 rtl:rotate-0 rtl:scale-[1_1] group-media-highlighted/menu-back-item:text-inherit'
          : 'shrink-0 drop-shadow-media-icon text-media-muted-foreground size-media-icon-sm rtl:scale-[-1_1] group-media-highlighted/menu-trigger-item:text-inherit',
        className,
      )}
    />
  )
}
