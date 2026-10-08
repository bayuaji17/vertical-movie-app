import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Episode, Season } from '#/lib/admin/series-client'
import type { AdminSeries } from './series-resource'
import type { EpisodeValues } from '#/lib/admin/series-form-state'
import {
  episodeValues,
  validateEpisode,
  episodeInput,
  patchEpisodeInput,
  episodeHref,
  seasonHref,
} from '#/lib/admin/series-form-state'
import { contentTextFields } from '#/lib/admin/content-form-state'
import { seriesKeys, seriesMutationOptions } from '#/lib/admin/series-queries'
import { ContentApiError } from '#/lib/admin/content-client'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { useSeriesEditor } from '#/hooks/use-series-editor'
import { UnsavedChangesGuard } from './unsaved-changes'
import { DiscardDialog } from './discard-dialog'
import { AdminPageHeading } from './page-heading'
import { GenrePicker } from './genre-picker'
import { Button } from '#/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Checkbox } from '#/components/ui/checkbox'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'

export function EpisodeEditor({
  series,
  episode,
  seasonId,
  seasons,
  stale,
}: {
  series: AdminSeries
  episode?: Episode
  seasonId: string
  seasons: Season[]
  stale: boolean
}) {
  const api = useSeriesEditor(
    series.data.id,
    episode?.id ?? `new-episode-${seasonId}`,
  )
  const [baseline, setBaseline] = useState(episode),
    [initial, setInitial] = useState(() => episodeValues(seasonId, episode)),
    [values, setValues] = useState(initial),
    [errors, setErrors] = useState<ReturnType<typeof validateEpisode>>({}),
    [confirmReload, setConfirmReload] = useState(false),
    [reloading, setReloading] = useState(false)
  const pending = useRef(false),
    mutation = useMutation(
      seriesMutationOptions(
        api.client,
        api.identity,
        series.data.id,
        () => api.scope.signal,
      ),
    )
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  useEffect(() => api.setDirty(dirty), [dirty, api.setDirty])
  const season = seasons.find((row) => row.id === values.seasonId),
    readonly =
      !!series.data.archivedAt ||
      !!season?.archivedAt ||
      (!!baseline &&
        (baseline.publicationStatus !== 'draft' || !!baseline.archivedAt)),
    changed = baseline && episode?.rowVersion !== baseline.rowVersion
  const locked =
    stale ||
    !api.online ||
    readonly ||
    mutation.isPending ||
    reloading ||
    !!changed
  const groupingLocked = !!baseline?.firstPublishedAt
  function field(
    name: keyof EpisodeValues,
    value: EpisodeValues[keyof EpisodeValues],
  ) {
    setValues((v) => ({ ...v, [name]: value }))
  }
  async function save() {
    const issues = validateEpisode(values, seasons, !!baseline)
    setErrors(issues)
    if (Object.keys(issues).length) {
      document.getElementById(Object.keys(issues)[0])?.focus()
      return
    }
    if (pending.current || locked) return
    const input = baseline
      ? patchEpisodeInput(values, baseline)
      : episodeInput(values)
    if (!input) return
    pending.current = true
    api.setError(undefined)
    const signal = api.scope.signal
    try {
      const result = await mutation.mutateAsync(
        baseline
          ? {
              action: 'patch-episode',
              id: baseline.id,
              input: { ...input, expectedVersion: baseline.rowVersion },
            }
          : { action: 'create-episode', input: episodeInput(values) },
      )
      await api.finish(
        signal,
        episodeHref(series.data.id, result.id),
        result.id,
      )
    } catch (error) {
      if (api.scope.accepts(signal)) api.setError(error)
    } finally {
      pending.current = false
    }
  }
  async function reload() {
    if (reloading || pending.current || !api.online) return
    setReloading(true)
    const signal = api.scope.signal
    try {
      if (!api.client)
        throw new ContentApiError(0, 'CONFIG_UNAVAILABLE', 'API unavailable')
      const row = baseline
        ? await api.client.episode(series.data.id, baseline.id, signal)
        : undefined
      const fresh = await api.client.seasons(series.data.id, true, signal)
      if (!api.scope.accepts(signal)) return
      if (row)
        api.cache.setQueryData(
          seriesKeys.episode(api.identity, series.data.id, row.id),
          row,
        )
      api.cache.setQueryData(
        seriesKeys.seasons(api.identity, series.data.id, true),
        fresh,
      )
      const next = episodeValues(row?.seasonId ?? seasonId, row)
      setBaseline(row)
      setInitial(next)
      setValues(next)
      setErrors({})
      api.setDirty(false)
      api.setError(undefined)
      setConfirmReload(false)
    } catch (error) {
      if (api.scope.accepts(signal)) api.setError(error)
    } finally {
      if (api.scope.accepts(signal)) setReloading(false)
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <UnsavedChangesGuard dirty={api.dirty} />
      <AdminPageHeading
        title={episode ? 'Edit episode' : 'Add episode'}
        description={series.data.title}
        actions={
          <>
            <Button
              nativeButton={false}
              variant="outline"
              className="min-h-11"
              render={
                <Link
                  to={
                    baseline
                      ? episodeHref(series.data.id, baseline.id)
                      : seasonHref(series.data.id, seasonId)
                  }
                />
              }
            >
              Back to {baseline ? 'episode' : 'episodes'}
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={!api.online || reloading || mutation.isPending}
              onClick={() => (dirty ? setConfirmReload(true) : void reload())}
            >
              Reload latest version
            </Button>
          </>
        }
      />
      {(stale || changed || !api.online || readonly) && (
        <Alert>
          <AlertTitle>
            {readonly
              ? 'Read only'
              : !api.online
                ? 'You are offline'
                : 'Metadata needs confirmation'}
          </AlertTitle>
          <AlertDescription>
            {readonly
              ? 'This episode or its parent is archived, or the episode is published.'
              : 'Your input is preserved. Confirm the latest saved version before saving.'}
          </AlertDescription>
        </Alert>
      )}
      {api.error != null && (
        <Alert variant="destructive">
          <AlertTitle>Could not save episode</AlertTitle>
          <AlertDescription>
            {contentErrorMessage(api.error, true)}
          </AlertDescription>
        </Alert>
      )}
      <form
        noValidate
        aria-busy={mutation.isPending}
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Episode information</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={!!errors.seasonId}>
                  <FieldLabel htmlFor="seasonId">Season</FieldLabel>
                  <NativeSelect
                    id="seasonId"
                    className="[&_select]:h-11"
                    value={values.seasonId}
                    disabled={
                      readonly ||
                      groupingLocked ||
                      mutation.isPending ||
                      reloading
                    }
                    aria-invalid={!!errors.seasonId}
                    onChange={(event) => field('seasonId', event.target.value)}
                  >
                    {seasons
                      .filter(
                        (row) => !row.archivedAt || row.id === values.seasonId,
                      )
                      .map((row) => (
                        <NativeSelectOption key={row.id} value={row.id}>
                          Season {row.seasonNumber}
                          {row.title ? ` · ${row.title}` : ''}
                          {row.archivedAt ? ' (archived)' : ''}
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                  <FieldError
                    errors={
                      errors.seasonId ? [{ message: errors.seasonId }] : []
                    }
                  />
                </Field>
                <Field data-invalid={!!errors.episodeNumber}>
                  <FieldLabel htmlFor="episodeNumber">
                    Episode number
                  </FieldLabel>
                  <Input
                    id="episodeNumber"
                    className="h-11"
                    inputMode="numeric"
                    maxLength={10}
                    value={values.episodeNumber}
                    disabled={
                      readonly ||
                      groupingLocked ||
                      mutation.isPending ||
                      reloading
                    }
                    aria-invalid={!!errors.episodeNumber}
                    onChange={(event) =>
                      field('episodeNumber', event.target.value)
                    }
                  />
                  <FieldError
                    errors={
                      errors.episodeNumber
                        ? [{ message: errors.episodeNumber }]
                        : []
                    }
                  />
                  <FieldDescription>
                    Numbers remain reserved after archive. Choose a number
                    available in this season.
                  </FieldDescription>
                </Field>
                {contentTextFields.map((spec) => {
                  const invalid = !!errors[spec.name],
                    props = {
                      id: spec.name,
                      value: values[spec.name],
                      maxLength: spec.max,
                      disabled:
                        readonly ||
                        mutation.isPending ||
                        reloading ||
                        (spec.name === 'slug' && groupingLocked),
                      'aria-invalid': invalid,
                      'aria-describedby': invalid
                        ? `${spec.name}-error`
                        : undefined,
                      onChange: (
                        event: React.ChangeEvent<
                          HTMLInputElement | HTMLTextAreaElement
                        >,
                      ) => field(spec.name, event.target.value),
                    }
                  return (
                    <Field
                      key={spec.name}
                      data-invalid={invalid}
                      className={
                        'multiline' in spec ? 'sm:col-span-2' : undefined
                      }
                    >
                      <FieldLabel htmlFor={spec.name}>
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
                          inputMode={
                            spec.name === 'releaseYear' ? 'numeric' : undefined
                          }
                        />
                      )}
                      <FieldError
                        id={`${spec.name}-error`}
                        errors={invalid ? [{ message: errors[spec.name] }] : []}
                      />
                      {spec.name === 'slug' && !baseline && (
                        <FieldDescription>
                          Leave blank to generate from the title.
                        </FieldDescription>
                      )}
                    </Field>
                  )
                })}
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Classification and rights</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field
                id="genreIds"
                tabIndex={-1}
                data-invalid={!!errors.genreIds}
              >
                <FieldLabel>Episode genres</FieldLabel>
                <FieldDescription>
                  Leave empty to inherit the series genres. Explicit episode
                  genres replace the inherited selection.
                </FieldDescription>
                <GenrePicker
                  value={values.genreIds}
                  onChange={(ids) => field('genreIds', ids)}
                  disabled={readonly || mutation.isPending || reloading}
                />
                <FieldError
                  errors={errors.genreIds ? [{ message: errors.genreIds }] : []}
                />
              </Field>
              <Field>
                <div className="flex min-h-11 items-center gap-3">
                  <Checkbox
                    id="rightsConfirmed"
                    checked={values.rightsConfirmed}
                    onCheckedChange={(checked) =>
                      field('rightsConfirmed', checked)
                    }
                    disabled={readonly || mutation.isPending || reloading}
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
            </FieldGroup>
          </CardContent>
        </Card>
        <Button
          type="submit"
          className="min-h-11 self-start"
          disabled={locked || (!!baseline && !dirty)}
        >
          {mutation.isPending ? 'Saving...' : 'Save episode'}
        </Button>
      </form>
      <DiscardDialog
        open={confirmReload}
        onOpenChange={setConfirmReload}
        title="Reload latest version?"
        description="This replaces your unsaved input with the current saved metadata."
        confirmLabel="Reload and discard"
        onConfirm={() => void reload()}
        pending={reloading}
      />
    </div>
  )
}
