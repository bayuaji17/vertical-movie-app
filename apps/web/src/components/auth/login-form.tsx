import { useState } from 'react'
import { RiLoader4Line } from '@remixicon/react'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
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

export function AdminLoginForm({ redirectTo }: AdminLoginFormProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [formError, setFormError] = useState<string>()

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmitInvalid: ({ formApi }) => {
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
        const result = await authClient.signIn.email(
          {
            email: normalizeLoginEmail(value.email),
            password: value.password,
          },
          { retry: 0 },
        )

        if (result.error) {
          setFormError(signInErrorMessage(result.error))
          return
        }
        await verifyAdminLogin(queryClient)
        publishAuthChange()
        await router.invalidate()
        await router.navigate({ to: redirectTo as never })
      } catch (error) {
        setFormError(
          error instanceof Error && error.name === 'AdminAccessDeniedError'
            ? 'Akun ini tidak memiliki akses admin.'
            : signInErrorMessage(error),
        )
      }
    },
  })

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="gap-2 px-6 pt-7 sm:px-8 sm:pt-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Vertical Movie
        </p>
        <CardTitle className="text-2xl tracking-tight">
          <h1>Masuk ke admin</h1>
        </CardTitle>
        <CardDescription>
          Gunakan akun administrator untuk mengelola katalog video.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 sm:px-8">
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
                        <Input
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
                        {invalid ? (
                          <FieldError
                            id={`${field.name}-error`}
                            errors={field.state.meta.errors.map((message) => ({
                              message: String(message),
                            }))}
                          />
                        ) : (
                          <FieldDescription>
                            Masukkan email administrator yang diprovision.
                          </FieldDescription>
                        )}
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
                        <Input
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
                        {invalid ? (
                          <FieldError
                            id={`${field.name}-error`}
                            errors={field.state.meta.errors.map((message) => ({
                              message: String(message),
                            }))}
                          />
                        ) : (
                          <FieldDescription>
                            Password administrator minimal 12 karakter.
                          </FieldDescription>
                        )}
                      </Field>
                    )
                  }}
                </form.Field>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-1 w-full"
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
                    'Masuk'
                  )}
                </Button>
              </FieldGroup>
            </form>
          )}
        </form.Subscribe>
      </CardContent>

      <CardFooter className="px-6 pb-7 sm:px-8 sm:pb-8">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Akses admin hanya tersedia untuk akun yang dibuat operator.
        </p>
      </CardFooter>
    </Card>
  )
}
