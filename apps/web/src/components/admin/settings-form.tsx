import { useState } from 'react'
import { RiPlayFill } from '@remixicon/react'
import { useSettingsEditor } from '#/hooks/use-settings-editor'
import { settingsLimits, defaultSiteSettings } from '#/lib/settings/model'
import type { SiteSettings } from '#/lib/settings/model'
import { AdminPageHeading } from './page-heading'
import { UnsavedChangesGuard } from './unsaved-changes'
import { DiscardDialog } from './discard-dialog'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '#/components/ui/card'
import {
  FieldGroup,
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Button } from '#/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { Separator } from '#/components/ui/separator'

const definitions: {
  key: keyof SiteSettings
  label: string
  help: string
  textarea?: boolean
}[] = [
  {
    key: 'siteName',
    label: 'Site name',
    help: 'The name in public navigation and page titles.',
  },
  {
    key: 'tagline',
    label: 'Tagline',
    help: 'A short introduction on the homepage. Leave blank to hide it.',
  },
  {
    key: 'description',
    label: 'Site description',
    help: 'Public page metadata when a title has no description. Single-line text.',
    textarea: true,
  },
  {
    key: 'footerText',
    label: 'Footer text',
    help: 'Shown below public pages. Leave blank to hide it.',
    textarea: true,
  },
]
export function SettingsForm() {
  const editor = useSettingsEditor(),
    { state, scope, query, online, dirty, errors } = editor
  const [discard, setDiscard] = useState<'cancel' | 'reload' | null>(null)
  const draft = state.draft,
    invalid = Object.keys(errors).length > 0
  const canSave =
    scope.dirty &&
    !invalid &&
    !state.pending &&
    online &&
    !['conflict', 'unknown'].includes(state.phase)
  const stale =
    !!state.remoteVersion ||
    (state.baseline &&
      query.data &&
      query.data.item.rowVersion > state.baseline.item.rowVersion)
  const preview = draft ?? defaultSiteSettings
  const reload = () => {
    if (dirty) setDiscard('reload')
    else editor.reload()
  }
  return (
    <>
      <UnsavedChangesGuard
        dirty={dirty}
        title="Discard your draft?"
        description="Keep editing to retain your draft, or discard it to leave this page. Use Check saved values to verify an unconfirmed Save."
      />
      <AdminPageHeading
        title="Site settings"
        description="Manage the text visitors see across your public site."
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge variant={dirty ? 'secondary' : 'outline'}>
          {state.pending
            ? 'Saving or checking…'
            : dirty
              ? state.phase === 'unknown'
                ? 'Unconfirmed Save'
                : 'Unsaved changes'
              : 'Saved values'}
        </Badge>
        {state.baseline && (
          <p className="text-xs text-muted-foreground">
            Last saved{' '}
            {new Date(state.baseline.item.updatedAt).toLocaleString()}
          </p>
        )}
      </div>
      <div className="mb-6 flex flex-col gap-3">
        {!online && (
          <Alert role="status">
            <AlertTitle>You are offline.</AlertTitle>
            <AlertDescription>
              You can keep editing. Reconnect to save or check stored values.
            </AlertDescription>
          </Alert>
        )}
        {query.isError && (
          <Alert>
            <AlertTitle>Settings could not be refreshed.</AlertTitle>
            <AlertDescription>
              Your existing input is retained.{' '}
              <Button
                variant="outline"
                className="mt-3 min-h-11"
                disabled={!online || query.isFetching || state.pending}
                onClick={editor.refresh}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {stale && state.phase !== 'conflict' && (
          <Alert>
            <AlertTitle>Saved values have changed.</AlertTitle>
            <AlertDescription>
              Reload saved values before saving again. Your draft is retained.
            </AlertDescription>
          </Alert>
        )}
        {state.message && (
          <Alert role="status" aria-live="polite">
            <AlertTitle>
              {state.phase === 'conflict'
                ? 'Settings conflict'
                : state.phase === 'unknown'
                  ? 'Save not confirmed'
                  : state.phase === 'saved'
                    ? 'Changes saved'
                    : 'Settings status'}
            </AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Public site text</CardTitle>
            <CardDescription>
              Site name is required. Other fields can be empty. Use plain text
              on one line.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!draft ? (
              <div
                aria-label="Loading site settings"
                className="flex flex-col gap-5"
              >
                {definitions.map((d) => (
                  <Skeleton
                    key={d.key}
                    className="h-16 w-full motion-reduce:animate-none"
                  />
                ))}
              </div>
            ) : (
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  editor.save()
                }}
              >
                <FieldGroup>
                  {definitions.map((d) => {
                    const id = 'setting-' + d.key,
                      error = errors[d.key],
                      count = [...draft[d.key].trim()].length
                    const props = {
                      id,
                      value: draft[d.key],
                      disabled: state.pending,
                      'aria-invalid': !!error,
                      'aria-describedby': `${id}-help ${id}-count${error ? ` ${id}-error` : ''}`,
                      onChange: (
                        event: React.ChangeEvent<
                          HTMLInputElement | HTMLTextAreaElement
                        >,
                      ) => scope.edit(d.key, event.target.value),
                      className: 'min-h-11 min-w-0 w-full',
                    }
                    return (
                      <Field
                        key={d.key}
                        orientation="horizontal"
                        data-invalid={!!error}
                        data-disabled={state.pending}
                        className="flex-col items-stretch sm:flex-row sm:items-start"
                      >
                        <FieldContent className="sm:w-36 sm:flex-none">
                          <FieldLabel htmlFor={id}>{d.label}</FieldLabel>
                          <FieldDescription id={id + '-help'}>
                            {d.help}
                          </FieldDescription>
                        </FieldContent>
                        <FieldContent className="min-w-0 flex-1">
                          {d.textarea ? (
                            <Textarea {...props} rows={3} />
                          ) : (
                            <Input {...props} autoComplete="off" />
                          )}
                          <p
                            id={id + '-count'}
                            className="text-xs text-muted-foreground"
                          >
                            {count} / {settingsLimits[d.key]} characters
                          </p>
                          {error && (
                            <FieldError id={id + '-error'}>{error}</FieldError>
                          )}
                        </FieldContent>
                      </Field>
                    )
                  })}
                </FieldGroup>
                <Separator className="my-6" />
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="min-h-11"
                    disabled={!canSave}
                  >
                    {state.pending ? 'Please wait…' : 'Save changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={!dirty || state.pending}
                    onClick={() => setDiscard('cancel')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="ghost"
                className="min-h-11"
                disabled={!online || state.pending || !state.baseline}
                onClick={reload}
              >
                Reload saved values
              </Button>
              {state.phase === 'unknown' && (
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={!online || state.pending}
                  onClick={() => editor.reload(true)}
                >
                  Check saved values
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 self-start xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle>Public preview</CardTitle>
            <CardDescription>
              {dirty
                ? 'Preview of your draft.'
                : 'Preview of the saved site text.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <section
              aria-label="Public site preview"
              className="flex min-w-0 flex-col gap-5 rounded-2xl border bg-background p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <RiPlayFill aria-hidden="true" className="size-5" />
                </span>
                <p className="min-w-0 font-heading text-lg font-semibold [overflow-wrap:anywhere]">
                  {preview.siteName || 'Site name'}
                </p>
              </div>
              <Separator />
              <div className="flex flex-col gap-3">
                <h2 className="font-heading text-2xl font-bold">Browse</h2>
                {preview.tagline && (
                  <p className="[overflow-wrap:anywhere]">{preview.tagline}</p>
                )}
                {preview.description && (
                  <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {preview.description}
                  </p>
                )}
              </div>
              {preview.footerText && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {preview.footerText}
                  </p>
                </>
              )}
            </section>
          </CardContent>
        </Card>
      </div>
      <DiscardDialog
        open={discard !== null}
        onOpenChange={(open) => {
          if (!open) setDiscard(null)
        }}
        title="Discard your draft?"
        description={
          discard === 'reload'
            ? 'Reloading will replace your draft with the latest saved values.'
            : 'Cancel restores the last confirmed values in this editor. Use Check saved values to verify an unconfirmed Save.'
        }
        confirmLabel={
          discard === 'reload' ? 'Discard and reload' : 'Discard changes'
        }
        pending={state.pending}
        onConfirm={() => {
          if (discard === 'reload') editor.reload()
          else scope.cancel()
          setDiscard(null)
        }}
      />
    </>
  )
}
