import { useState } from 'react'
import {
  RiArrowRightLine,
  RiLoader4Line,
  RiLockLine,
  RiMailLine,
  RiShieldCheckLine,
} from '@remixicon/react'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
import { Separator } from '#/components/ui/separator'
import { toast } from '#/components/ui/toast'
import { authClient } from '#/lib/auth/client'
import {
  normalizeLoginEmail,
  signInErrorMessage,
  validateLoginEmail,
  validateLoginPassword,
} from '#/lib/auth/login'
import { verifyAdminLogin, publishAuthChange } from '#/lib/auth/transitions'

type AdminLoginFormProps = {
  redirectTo: string
}

function loginFailureMessage(error: unknown): string {
  return error instanceof Error && error.name === 'AdminAccessDeniedError'
    ? 'Akun ini tidak memiliki akses admin.'
    : signInErrorMessage(error)
}

export function AdminLoginForm({ redirectTo }: AdminLoginFormProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [formError, setFormError] = useState<string>()

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmitInvalid: ({ formApi }) => {
      toast.add({
        title: 'Periksa data login',
        description: 'Lengkapi email dan password sesuai petunjuk formulir.',
        type: 'error',
      })
      const firstInvalid = formApi.state.fieldMeta.email?.errors.length
        ? 'email'
        : 'password'
      requestAnimationFrame(() => {
        document.getElementById(firstInvalid)?.focus()
      })
    },
    onSubmit: async ({ value }) => {
      setFormError(undefined)

      try {
        await toast.promise(
          (async () => {
            const result = await authClient.signIn.email(
              {
                email: normalizeLoginEmail(value.email),
                password: value.password,
              },
              { retry: 0 },
            )
            if (result.error) throw result.error
            await verifyAdminLogin(queryClient)
            publishAuthChange()
            await router.invalidate()
            await router.navigate({ to: redirectTo as never })
          })(),
          {
            loading: {
              title: 'Memproses login...',
              description: 'Memeriksa akun dan akses admin.',
            },
            success: {
              title: 'Login berhasil',
              description: 'Anda sudah masuk ke dashboard admin.',
            },
            error: (error: unknown) => ({
              title: 'Login gagal',
              description: loginFailureMessage(error),
            }),
          },
        )
      } catch (error) {
        setFormError(loginFailureMessage(error))
      }
    },
  })

  return (
    <section
      className="flex w-full flex-col gap-8"
      aria-labelledby="admin-login-title"
    >
      <div className="flex flex-col gap-5">
        <span
          className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <RiLockLine className="size-6" />
        </span>
        <div className="flex flex-col gap-3">
          <h1
            id="admin-login-title"
            className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Masuk ke admin
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
            Gunakan akun administrator untuk mengelola katalog video.
          </p>
        </div>
      </div>

      <div>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <form
              noValidate
              aria-busy={isSubmitting}
              onSubmit={(event) => {
                event.preventDefault()
                event.stopPropagation()
                void form.handleSubmit()
              }}
            >
              <FieldGroup className="gap-5">
                {formError ? (
                  <Alert variant="destructive" aria-live="assertive">
                    <AlertTitle>Login gagal</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                ) : null}

                <form.Field
                  name="email"
                  validators={{
                    onBlur: ({ value }) => validateLoginEmail(value),
                    onSubmit: ({ value }) => validateLoginEmail(value),
                  }}
                >
                  {(field) => {
                    const invalid = field.state.meta.errors.length > 0
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <InputGroup
                          className="h-11"
                          data-disabled={isSubmitting}
                        >
                          <InputGroupInput
                            id={field.name}
                            name={field.name}
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            placeholder="admin@example.com"
                            value={field.state.value}
                            disabled={isSubmitting}
                            aria-invalid={invalid}
                            aria-describedby={
                              invalid ? `${field.name}-error` : undefined
                            }
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />
                          <InputGroupAddon>
                            <RiMailLine aria-hidden="true" />
                          </InputGroupAddon>
                        </InputGroup>
                        {invalid ? (
                          <FieldError
                            id={`${field.name}-error`}
                            errors={field.state.meta.errors.map((message) => ({
                              message: String(message),
                            }))}
                          />
                        ) : null}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field
                  name="password"
                  validators={{
                    onBlur: ({ value }) => validateLoginPassword(value),
                    onSubmit: ({ value }) => validateLoginPassword(value),
                  }}
                >
                  {(field) => {
                    const invalid = field.state.meta.errors.length > 0
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                        <InputGroup
                          className="h-11"
                          data-disabled={isSubmitting}
                        >
                          <InputGroupInput
                            id={field.name}
                            name={field.name}
                            type="password"
                            autoComplete="current-password"
                            value={field.state.value}
                            disabled={isSubmitting}
                            aria-invalid={invalid}
                            aria-describedby={
                              invalid ? `${field.name}-error` : undefined
                            }
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />
                          <InputGroupAddon>
                            <RiLockLine aria-hidden="true" />
                          </InputGroupAddon>
                        </InputGroup>
                        {invalid ? (
                          <FieldError
                            id={`${field.name}-error`}
                            errors={field.state.meta.errors.map((message) => ({
                              message: String(message),
                            }))}
                          />
                        ) : (
                          <FieldDescription>
                            Minimal 12 karakter.
                          </FieldDescription>
                        )}
                      </Field>
                    )
                  }}
                </form.Field>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-1 h-11 w-full justify-between"
                  disabled={isSubmitting}
                  aria-disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RiLoader4Line
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden="true"
                      />
                      Memeriksa...
                    </>
                  ) : (
                    <>
                      <span className="flex-1">Masuk</span>
                      <RiArrowRightLine
                        data-icon="inline-end"
                        aria-hidden="true"
                      />
                    </>
                  )}
                </Button>
              </FieldGroup>
            </form>
          )}
        </form.Subscribe>
      </div>

      <Separator />
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <RiShieldCheckLine className="size-5" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Khusus akun administrator.
          <br />
          Akses diberikan oleh pengelola situs.
        </p>
      </div>
    </section>
  )
}
