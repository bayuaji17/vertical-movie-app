import { RiCloseLine } from '@remixicon/react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '#/components/ui/dialog'
import type { CatalogItem } from '#/lib/catalog/public-catalog-model'
import {
  genreLabels,
  itemLength,
  kindLabels,
} from '#/lib/catalog/public-catalog-model'
import { Poster } from './poster'

export function CatalogDetailDialog({
  item,
  trigger,
  onClose,
}: {
  item: CatalogItem | null
  trigger: HTMLElement | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={!!item}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        finalFocus={trigger ? () => trigger : undefined}
        className="max-h-[85svh] overflow-y-auto sm:max-w-lg"
      >
        {item && (
          <>
            <DialogHeader className="pr-10">
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>{item.synopsis}</DialogDescription>
            </DialogHeader>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 size-11"
                  aria-label="Close details"
                />
              }
            >
              <RiCloseLine aria-hidden="true" />
            </DialogClose>
            <div className="mx-auto w-32 sm:w-40">
              <Poster item={item} />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Badge variant="secondary">{kindLabels[item.kind]}</Badge>
              <span>{genreLabels(item)}</span>
              <span>{itemLength(item)}</span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
