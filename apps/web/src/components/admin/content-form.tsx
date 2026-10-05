import { useEffect } from 'react'
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
export function ContentForm({
  initialValues,
  baseline,
  onSubmit,
  error,
  onDirtyChange,
  locked = false,
}: {
  initialValues: ContentValues
  baseline?: ContentDetail
  onSubmit: (value: ContentValues) => Promise<void>
  error?: unknown
  onDirtyChange: (value: boolean) => void
  locked?: boolean
}) {
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
      requestAnimationFrame(() => document.getElementById(first)?.focus())
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })
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
                  {contentTextFields.map((spec) => (
                    <form.Field
                      key={spec.name}
                      name={spec.name}
                      validators={{
                        onBlur: ({ fieldApi }) =>
                          validateContentValues(
                            fieldApi.form.state.values,
                            !!baseline,
                          )[spec.name],
                      }}
                    >
                      {(field) => {
                        const messages = field.state.meta.errors.map(
                          (message) => ({ message: String(message) }),
                        )
                        if (
                          spec.name === 'slug' &&
                          error instanceof ContentApiError &&
                          error.code === 'SLUG_CONFLICT'
                        )
                          messages.push({
                            message:
                              'This slug is already in use. Choose another.',
                          })
                        const invalid = messages.length > 0
                        const props = {
                          id: field.name,
                          name: field.name,
                          value: field.state.value,
                          disabled: pending,
                          'aria-invalid': invalid,
                          'aria-describedby': invalid
                            ? `${field.name}-error`
                            : undefined,
                          onBlur: field.handleBlur,
                          onChange: (
                            event: React.ChangeEvent<
                              HTMLInputElement | HTMLTextAreaElement
                            >,
                          ) => field.handleChange(event.target.value),
                          maxLength: spec.max,
                        }
                        return (
                          <Field
                            data-invalid={invalid}
                            className={
                              'multiline' in spec ? 'sm:col-span-2' : undefined
                            }
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
                                type={
                                  spec.name === 'releaseDate' ? 'date' : 'text'
                                }
                                inputMode={
                                  spec.name === 'releaseYear'
                                    ? 'numeric'
                                    : undefined
                                }
                              />
                            )}
                            {invalid && (
                              <FieldError
                                id={`${field.name}-error`}
                                errors={messages}
                              />
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
                  ))}
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
                      />
                      <FieldError
                        errors={field.state.meta.errors.map((message) => ({
                          message: String(message),
                        }))}
                      />
                    </FieldSet>
                  )}
                </form.Field>
                {values.type === 'series' ? (
                  <form.Field name="completionStatus">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="completionStatus">
                          Series completion
                        </FieldLabel>
                        <NativeSelect
                          id="completionStatus"
                          className="[&_select]:h-11"
                          disabled={pending}
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(
                              event.target.value === 'completed'
                                ? 'completed'
                                : 'ongoing',
                            )
                          }
                        >
                          <NativeSelectOption value="ongoing">
                            Ongoing
                          </NativeSelectOption>
                          <NativeSelectOption value="completed">
                            Completed
                          </NativeSelectOption>
                        </NativeSelect>
                        <FieldDescription>
                          A default season is created with the series. Episode
                          management follows separately.
                        </FieldDescription>
                      </Field>
                    )}
                  </form.Field>
                ) : (
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
                            I confirm that I have the rights to distribute this
                            content.
                          </FieldLabel>
                        </div>
                        <FieldDescription>
                          Rights confirmation is optional for a draft.
                        </FieldDescription>
                      </Field>
                    )}
                  </form.Field>
                )}
              </FieldGroup>
            </CardContent>
          </Card>
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
                  : 'Create draft'}
            </Button>
          </div>
        </form>
      )}
    </form.Subscribe>
  )
}
