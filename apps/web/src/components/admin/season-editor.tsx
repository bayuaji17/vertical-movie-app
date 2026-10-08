import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Season } from '#/lib/admin/series-client'
import type { AdminSeries } from './series-resource'
import {
  seasonValues,
  validateSeason,
  seasonInput,
  patchSeasonInput,
  seasonsHref,
} from '#/lib/admin/series-form-state'
import { seriesKeys, seriesMutationOptions } from '#/lib/admin/series-queries'
import { ContentApiError } from '#/lib/admin/content-client'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { useSeriesEditor } from '#/hooks/use-series-editor'
import { UnsavedChangesGuard } from './unsaved-changes'
import { DiscardDialog } from './discard-dialog'
import { AdminPageHeading } from './page-heading'
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
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'

const fields = [
  ['seasonNumber', 'Season number'],
  ['title', 'Season title'],
  ['description', 'Description'],
  ['releaseYear', 'Release year'],
  ['releaseDate', 'Release date'],
] as const
export function SeasonEditor({
  series,
  season,
  seasons,
  stale,
}: {
  series: AdminSeries
  season?: Season
  seasons: Season[]
  stale: boolean
}) {
  const api = useSeriesEditor(series.data.id, season?.id ?? 'new-season')
  const [baseline, setBaseline] = useState(season),
    [initial, setInitial] = useState(() => seasonValues(season, seasons)),
    [values, setValues] = useState(initial),
    [errors, setErrors] = useState<ReturnType<typeof validateSeason>>({}),
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
  const changed = baseline && season?.rowVersion !== baseline.rowVersion
  const locked =
    stale ||
    !api.online ||
    !!series.data.archivedAt ||
    !!baseline?.archivedAt ||
    mutation.isPending ||
    reloading ||
    !!changed
  async function save() {
    const issues = validateSeason(values)
    setErrors(issues)
    if (Object.keys(issues).length) {
      document.getElementById(Object.keys(issues)[0])?.focus()
      return
    }
    if (pending.current || locked) return
    const input = baseline
      ? patchSeasonInput(values, baseline)
      : seasonInput(values)
    if (!input) return
    pending.current = true
    api.setError(undefined)
    const signal = api.scope.signal
    try {
      await mutation.mutateAsync(
        baseline
          ? {
              action: 'patch-season',
              id: baseline.id,
              input: { ...input, expectedVersion: baseline.rowVersion },
            }
          : { action: 'create-season', input: seasonInput(values) },
      )
      await api.finish(signal, seasonsHref(series.data.id))
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
      const fresh = await api.client.seasons(series.data.id, true, signal)
      if (!api.scope.accepts(signal)) return
      const row = baseline
        ? fresh.items.find((item) => item.id === baseline.id)
        : undefined
      if (baseline && !row)
        throw new ContentApiError(404, 'CONTENT_NOT_FOUND', 'Season not found')
      api.cache.setQueryData(
        seriesKeys.seasons(api.identity, series.data.id, true),
        fresh,
      )
      const next = seasonValues(row, fresh.items)
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
        title={season ? 'Edit season' : 'Add season'}
        description={series.data.title}
        actions={
          <>
            <Button
              nativeButton={false}
              variant="outline"
              className="min-h-11"
              render={<Link to={seasonsHref(series.data.id)} />}
            >
              Back to seasons
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
      {(stale || changed || !api.online) && (
        <Alert>
          <AlertTitle>
            {!api.online ? 'You are offline' : 'Metadata needs confirmation'}
          </AlertTitle>
          <AlertDescription>
            Your input is preserved. Confirm the latest saved version before
            saving.
          </AlertDescription>
        </Alert>
      )}
      {api.error != null && (
        <Alert variant="destructive">
          <AlertTitle>Could not save season</AlertTitle>
          <AlertDescription>
            {contentErrorMessage(api.error, true)}
          </AlertDescription>
        </Alert>
      )}
      <form
        noValidate
        aria-busy={mutation.isPending}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Season information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <FieldGroup>
              {fields.map(([name, label]) => (
                <Field key={name} data-invalid={!!errors[name]}>
                  <FieldLabel htmlFor={name}>{label}</FieldLabel>
                  {name === 'description' ? (
                    <Textarea
                      id={name}
                      value={values[name]}
                      maxLength={10000}
                      disabled={mutation.isPending || reloading}
                      aria-invalid={!!errors[name]}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [name]: e.target.value }))
                      }
                    />
                  ) : (
                    <Input
                      id={name}
                      value={values[name]}
                      maxLength={
                        name === 'title'
                          ? 200
                          : name === 'releaseDate'
                            ? 10
                            : 10
                      }
                      inputMode={
                        name === 'seasonNumber' || name === 'releaseYear'
                          ? 'numeric'
                          : undefined
                      }
                      className="h-11"
                      disabled={mutation.isPending || reloading}
                      aria-invalid={!!errors[name]}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [name]: e.target.value }))
                      }
                    />
                  )}
                  <FieldError
                    errors={errors[name] ? [{ message: errors[name] }] : []}
                  />
                  {name === 'seasonNumber' && (
                    <FieldDescription>
                      Numbers are unique within this series and remain reserved
                      after archive. The suggested number is not reserved until
                      saved.
                    </FieldDescription>
                  )}
                </Field>
              ))}
            </FieldGroup>
            <Button
              type="submit"
              className="min-h-11 self-start"
              disabled={locked || (!dirty && !!baseline)}
            >
              {mutation.isPending ? 'Saving...' : 'Save season'}
            </Button>
          </CardContent>
        </Card>
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
