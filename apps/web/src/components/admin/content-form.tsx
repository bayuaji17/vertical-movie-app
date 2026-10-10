import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import type { ContentDetail } from '#/lib/admin/content-client'
import {
  contentLabels,
  contentTypes,
  isContentType,
  ContentApiError,
} from '#/lib/admin/content-client'
import type { ContentValues } from '#/lib/admin/content-form-state'
import {
  contentTextFields,
  validateContentValues,
  contentValuesChanged,
  patchContentCommand,
} from '#/lib/admin/content-form-state'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { contentSearch } from '#/lib/admin/content-list-state'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from '#/components/ui/field'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { GenrePicker } from './genre-picker'

function DirtySignal({
  dirty,
  onChange,
}: {
  dirty: boolean
  onChange: (value: boolean) => void
}) {
  useEffect(() => onChange(dirty), [dirty, onChange])
  return null
}
const quickTypeHints = {
  film: 'One video, up to 30 minutes',
  standalone: 'A single short video',
  series: 'Seasons and episodes',
} as const
export function ContentForm({
  initialValues,
  baseline,
  onSubmit,
  error,
  onDirtyChange,
  locked = false,
  variant = 'full',
}: {
  initialValues: ContentValues
  baseline?: ContentDetail
  onSubmit: (value: ContentValues) => Promise<void>
  error?: unknown
  onDirtyChange: (value: boolean) => void
  locked?: boolean
  // 'quick' asks only for type and title; everything else is optional.
  variant?: 'full' | 'quick'
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: ({ value }) => {
        const fields = validateContentValues(value, !!baseline)
        return Object.keys(fields).length ? { fields } : undefined
      },
    },
    onSubmitInvalid: ({ formApi }) => {
      const first = Object.keys(
        validateContentValues(formApi.state.values, !!baseline),
      )[0]
      if (variant === 'quick' && first !== 'title' && first !== 'type')
        setDetailsOpen(true)
      requestAnimationFrame(() => document.getElementById(first)?.focus())
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })
  const textField = (
    spec: (typeof contentTextFields)[number],
    pending: boolean,
  ) => (
    <form.Field
      key={spec.name}
      name={spec.name}
      validators={{
        onBlur: ({ fieldApi }) =>
          validateContentValues(fieldApi.form.state.values, !!baseline)[
            spec.name
          ],
      }}
    >
      {(field) => {
        const messages = field.state.meta.errors.map((message) => ({
          message: String(message),
        }))
        if (
          spec.name === 'slug' &&
          error instanceof ContentApiError &&
          error.code === 'SLUG_CONFLICT'
        )
          messages.push({
            message: 'This slug is already in use. Choose another.',
          })
        const invalid = messages.length > 0
        const props = {
          id: field.name,
          name: field.name,
          value: field.state.value,
          disabled: pending,
          'aria-invalid': invalid,
          'aria-describedby': invalid ? `${field.name}-error` : undefined,
          onBlur: field.handleBlur,
          onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => field.handleChange(event.target.value),
          maxLength: spec.max,
        }
        return (
          <Field
            data-invalid={invalid}
            className={'multiline' in spec ? 'sm:col-span-2' : undefined}
          >
            <FieldLabel htmlFor={field.name}>
              {spec.label}
              {'required' in spec ? ' *' : ''}
            </FieldLabel>
            {'multiline' in spec ? (
              <Textarea {...props} className="min-h-28" />
            ) : (
              <Input
                {...props}
                className="h-11"
                type={spec.name === 'releaseDate' ? 'date' : 'text'}
                inputMode={spec.name === 'releaseYear' ? 'numeric' : undefined}
              />
            )}
            {invalid && (
              <FieldError id={`${field.name}-error`} errors={messages} />
            )}
            {spec.name === 'slug' && !baseline && (
              <FieldDescription>
                Leave blank to generate from the title.
              </FieldDescription>
            )}
            {spec.name === 'originalLanguage' && (
              <FieldDescription>
                Language tag, for example en or id-ID.
              </FieldDescription>
            )}
          </Field>
        )
      }}
    </form.Field>
  )
  const genresField = (pending: boolean) => (
    <form.Field name="genreIds">
      {(field) => (
        <FieldSet
          id="genreIds"
          tabIndex={-1}
          data-invalid={field.state.meta.errors.length > 0}
        >
          <FieldLegend>Genres</FieldLegend>
          <GenrePicker
            value={field.state.value}
            onChange={field.handleChange}
            disabled={pending}
            knownGenres={
              baseline && baseline.type !== 'series'
                ? baseline.data.effectiveGenres
                : undefined
            }
          />
          <FieldError
            errors={field.state.meta.errors.map((message) => ({
              message: String(message),
            }))}
          />
        </FieldSet>
      )}
    </form.Field>
  )
  const completionField = (pending: boolean) => (
    <form.Field name="completionStatus">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="completionStatus">Series completion</FieldLabel>
          <NativeSelect
            id="completionStatus"
            className="[&_select]:h-11"
            disabled={pending}
            value={field.state.value}
            onChange={(event) =>
              field.handleChange(
                event.target.value === 'completed' ? 'completed' : 'ongoing',
              )
            }
          >
            <NativeSelectOption value="ongoing">Ongoing</NativeSelectOption>
            <NativeSelectOption value="completed">Completed</NativeSelectOption>
          </NativeSelect>
          <FieldDescription>
            A default season is created with the series. Manage seasons and
            episodes from the series details after saving.
          </FieldDescription>
        </Field>
      )}
    </form.Field>
  )
  const rightsField = (pending: boolean) => (
    <form.Field name="rightsConfirmed">
      {(field) => (
        <Field>
          <div className="flex min-h-11 items-center gap-3">
            <Checkbox
              id="rightsConfirmed"
              disabled={pending}
              checked={field.state.value}
              onCheckedChange={field.handleChange}
            />
            <FieldLabel
              htmlFor="rightsConfirmed"
              className="min-h-11 cursor-pointer items-center text-sm"
            >
              I confirm that I have the rights to distribute this content.
            </FieldLabel>
          </div>
          <FieldDescription>
            Rights confirmation is optional for a draft.
          </FieldDescription>
        </Field>
      )}
    </form.Field>
  )
  return (
    <form.Subscribe
      selector={(state) =>
        [state.values, state.isSubmitting || locked] as const
      }
    >
      {([values, pending]) => (
        <form
          noValidate
          aria-busy={pending}
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            if (!locked && !form.state.isSubmitting) void form.handleSubmit()
          }}
          className="space-y-6"
        >
          <DirtySignal
            dirty={contentValuesChanged(values, initialValues)}
            onChange={onDirtyChange}
          />
          {error != null && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Could not save content</AlertTitle>
              <AlertDescription>
                {contentErrorMessage(error, true)}
              </AlertDescription>
            </Alert>
          )}
          {variant === 'quick' ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>What are you adding?</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <form.Field name="type">
                      {(field) => (
                        <FieldSet>
                          <FieldLegend className="sr-only">
                            Content type
                          </FieldLegend>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {contentTypes.map((option) => (
                              <label key={option} className="relative block">
                                <input
                                  type="radio"
                                  name="type"
                                  id={
                                    option === field.state.value
                                      ? 'type'
                                      : undefined
                                  }
                                  value={option}
                                  checked={field.state.value === option}
                                  disabled={pending}
                                  className="peer sr-only"
                                  onChange={() => field.handleChange(option)}
                                />
                                <span className="flex min-h-16 cursor-pointer flex-col justify-center gap-0.5 rounded-2xl border px-4 py-3 peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                                  <span className="text-sm font-semibold">
                                    {contentLabels[option]}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {quickTypeHints[option]}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </FieldSet>
                      )}
                    </form.Field>
                    {textField(contentTextFields[0], pending)}
                  </FieldGroup>
                </CardContent>
              </Card>
              <details
                open={detailsOpen}
                onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
                className="rounded-2xl border bg-card"
              >
                <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-5 text-sm font-semibold">
                  <span>
                    More details{' '}
                    <span className="font-normal text-muted-foreground">
                      · optional
                    </span>
                  </span>
                </summary>
                <div className="space-y-6 border-t p-5">
                  <p className="text-sm text-muted-foreground">
                    Synopsis, genres, release year and language. You can add
                    them any time before publishing.
                  </p>
                  <FieldGroup>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {contentTextFields
                        .filter((spec) => spec.name !== 'title')
                        .map((spec) => textField(spec, pending))}
                    </div>
                    {genresField(pending)}
                    {values.type === 'series' ? completionField(pending) : null}
                  </FieldGroup>
                </div>
              </details>
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Basic information</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <form.Field name="type">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor="type">Content type</FieldLabel>
                          <NativeSelect
                            id="type"
                            value={field.state.value}
                            disabled={!!baseline || pending}
                            className="[&_select]:h-11"
                            onChange={(event) => {
                              if (isContentType(event.target.value))
                                field.handleChange(event.target.value)
                            }}
                          >
                            {contentTypes.map((type) => (
                              <NativeSelectOption key={type} value={type}>
                                {contentLabels[type]}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          <FieldDescription>
                            {baseline
                              ? 'Content type cannot be changed.'
                              : 'Create metadata first. Video and cover upload will follow in a separate workflow.'}
                          </FieldDescription>
                        </Field>
                      )}
                    </form.Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {contentTextFields.map((spec) =>
                        textField(spec, pending),
                      )}
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Classification</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    {genresField(pending)}
                    {values.type === 'series'
                      ? completionField(pending)
                      : rightsField(pending)}
                  </FieldGroup>
                </CardContent>
              </Card>
            </>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={pending}
              nativeButton={false}
              render={<Link to="/admin/content" search={contentSearch({})} />}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-h-11"
              disabled={
                pending ||
                (!!baseline &&
                  Object.keys(validateContentValues(values, true)).length ===
                    0 &&
                  !patchContentCommand(values, baseline))
              }
            >
              {pending
                ? 'Saving...'
                : baseline
                  ? 'Save changes'
                  : variant === 'quick'
                    ? 'Save & continue'
                    : 'Create draft'}
            </Button>
          </div>
        </form>
      )}
    </form.Subscribe>
  )
}
