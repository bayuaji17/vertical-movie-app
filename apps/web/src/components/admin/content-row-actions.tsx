import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { RiDeleteBinLine, RiMore2Fill } from '@remixicon/react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { DeleteDialog } from './delete-content'
import type { ContentItem } from '#/lib/admin/content-client'
import { rowActions } from '#/lib/admin/row-actions'
import { seasonsHref } from '#/lib/admin/series-form-state'

/**
 * One primary action and a "⋯" menu. Delete sits last, apart from the primary
 * action. Its dialog belongs to the row so it outlives the closing menu.
 */
export function ContentRowActions({
  item,
  onDeleted,
}: {
  item: ContentItem
  onDeleted?: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const actions = rowActions(item)
  const { primary } = actions
  const label = (
    <>
      {primary.label}
      <span className="sr-only"> {item.title}</span>
    </>
  )
  const detail = { type: item.type, id: item.id }
  return (
    <div className="flex items-center gap-2">
      {primary.kind === 'setup' &&
      (item.type === 'film' || item.type === 'standalone') ? (
        <Button
          className="min-h-11"
          nativeButton={false}
          render={
            <Link
              to="/admin/content/$type/$id/setup"
              params={detail}
              search={{ step: undefined }}
            />
          }
        >
          {label}
        </Button>
      ) : primary.kind === 'seasons' ? (
        <Button
          className="min-h-11"
          nativeButton={false}
          render={<Link to={seasonsHref(item.id)} />}
        >
          {label}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="min-h-11"
          nativeButton={false}
          render={<Link to="/admin/content/$type/$id" params={detail} />}
        >
          {label}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="size-11"
              aria-label={`Actions for ${item.title}`}
            />
          }
        >
          <RiMore2Fill aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {actions.details && (
            <DropdownMenuItem
              className="min-h-11"
              render={<Link to="/admin/content/$type/$id" params={detail} />}
            >
              Details
            </DropdownMenuItem>
          )}
          {actions.edit && (
            <DropdownMenuItem
              className="min-h-11"
              render={
                <Link to="/admin/content/$type/$id/edit" params={detail} />
              }
            >
              Edit draft
            </DropdownMenuItem>
          )}
          {(actions.details || actions.edit) && <DropdownMenuSeparator />}
          <DropdownMenuItem
            variant="destructive"
            className="min-h-11"
            disabled={!!actions.deleteBlock}
            onClick={() => setDeleting(true)}
          >
            <RiDeleteBinLine aria-hidden="true" />
            <span className="grid">
              Delete
              {actions.deleteBlock && (
                <span className="text-xs font-normal text-muted-foreground">
                  Archive it first
                </span>
              )}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteDialog
        target={actions.deleteTarget}
        open={deleting}
        onOpenChange={setDeleting}
        onDeleted={onDeleted}
      />
    </div>
  )
}
