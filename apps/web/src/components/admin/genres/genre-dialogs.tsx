import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { toast } from '#/components/ui/toast'
import { submitRemove, submitRename } from '#/lib/admin/genres-actions'
import type { GenreFormValues } from '#/lib/admin/genres-actions'
import type { Genre, GenresClient } from '#/lib/admin/genres-client'
import {
  invalidateGenres,
  removeGenreOptions,
  renameGenreOptions,
} from '#/lib/admin/genres-queries'

export type GenreDialogState =
  | { kind: 'rename'; genre: Genre }
  | { kind: 'delete'; genre: Genre }
  | undefined

export function GenreDialogs({
  state,
  onClose,
  client,
  identity,
}: {
  state: GenreDialogState
  onClose: () => void
  client: GenresClient | undefined
  identity: string
}) {
  return (
    <>
      <Dialog
        open={state?.kind === 'rename'}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <DialogContent>
          {state?.kind === 'rename' && (
            <RenameGenreForm
              key={state.genre.id}
              genre={state.genre}
              client={client}
              identity={identity}
              onDone={onClose}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={state?.kind === 'delete'}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <AlertDialogContent>
          {state?.kind === 'delete' && (
            <DeleteGenreContent
              key={state.genre.id}
              genre={state.genre}
              client={client}
              identity={identity}
              onDone={onClose}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function RenameGenreForm({
  genre,
  client,
  identity,
  onDone,
}: {
  genre: Genre
  client: GenresClient | undefined
  identity: string
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation(renameGenreOptions(client, identity))
  const [values, setValues] = useState<GenreFormValues>({
    name: genre.name,
    slug: genre.slug,
    slugTouched: true,
  })
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})
  const [notice, setNotice] = useState<string>()
  const pending = useRef(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setNotice(undefined)
    try {
      const outcome = await submitRename(
        genre,
        (id, input) => mutation.mutateAsync({ id, input }),
        values,
      )
      if (outcome.status === 'invalid') {
        setErrors({ name: outcome.nameError, slug: outcome.slugError })
      } else if (outcome.status === 'failed') {
        setErrors({ slug: outcome.slugError })
        if (!outcome.slugError) setNotice(outcome.message)
      } else {
        toast.add({
          title: 'Genre updated',
          description: `${outcome.genre.name} was saved.`,
          type: 'success',
        })
        await invalidateGenres(queryClient, identity)
        onDone()
      }
    } finally {
      pending.current = false
    }
  }
  const busy = mutation.isPending
  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-5"
    >
      <DialogHeader>
        <DialogTitle>Rename genre</DialogTitle>
        <DialogDescription>
          Content keeps this genre when you rename it.
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="rename-genre-name">Name</FieldLabel>
        <Input
          id="rename-genre-name"
          className="h-11"
          value={values.name}
          disabled={busy}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'rename-genre-name-error' : undefined}
          onChange={(event) => {
            setValues({ ...values, name: event.target.value })
            if (errors.name) setErrors({ ...errors, name: undefined })
          }}
        />
        {errors.name && (
          <FieldError
            id="rename-genre-name-error"
            errors={[{ message: errors.name }]}
          />
        )}
      </Field>
      <Field data-invalid={!!errors.slug}>
        <FieldLabel htmlFor="rename-genre-slug">Slug</FieldLabel>
        <Input
          id="rename-genre-slug"
          className="h-11"
          value={values.slug}
          disabled={busy}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={!!errors.slug}
          aria-describedby={
            errors.slug ? 'rename-genre-slug-error' : 'rename-genre-slug-hint'
          }
          onChange={(event) => {
            setValues({ ...values, slug: event.target.value })
            if (errors.slug) setErrors({ ...errors, slug: undefined })
          }}
        />
        {errors.slug ? (
          <FieldError
            id="rename-genre-slug-error"
            errors={[{ message: errors.slug }]}
          />
        ) : (
          <FieldDescription id="rename-genre-slug-hint">
            Changing the slug changes public links that use it.
          </FieldDescription>
        )}
      </Field>
      {notice && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Genre not updated</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button type="submit" className="min-h-11" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function DeleteGenreContent({
  genre,
  client,
  identity,
  onDone,
}: {
  genre: Genre
  client: GenresClient | undefined
  identity: string
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation(removeGenreOptions(client, identity))
  const [notice, setNotice] = useState<string>()
  const pending = useRef(false)
  async function confirm() {
    if (pending.current) return
    pending.current = true
    setNotice(undefined)
    try {
      const outcome = await submitRemove(
        (id) => mutation.mutateAsync(id),
        genre,
      )
      if (outcome.status === 'removed') {
        toast.add({
          title: 'Genre deleted',
          description: `${genre.name} was removed.`,
          type: 'success',
        })
        await invalidateGenres(queryClient, identity)
        onDone()
      } else setNotice(outcome.message)
    } finally {
      pending.current = false
    }
  }
  const busy = mutation.isPending
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete “{genre.name}”?</AlertDialogTitle>
        <AlertDialogDescription>
          A genre that content still uses can&apos;t be deleted. This can&apos;t
          be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {notice && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Genre not deleted</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel className="min-h-11" disabled={busy}>
          Cancel
        </AlertDialogCancel>
        <Button
          type="button"
          variant="destructive"
          className="min-h-11"
          disabled={busy}
          onClick={() => void confirm()}
        >
          {busy ? 'Deleting…' : 'Delete genre'}
        </Button>
      </AlertDialogFooter>
    </>
  )
}
