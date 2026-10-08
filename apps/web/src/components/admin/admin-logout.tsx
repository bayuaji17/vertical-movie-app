import { RiLogoutBoxRLine, RiLoader4Line } from '@remixicon/react'
import { Button } from '#/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import type { useAdminLogout } from '#/hooks/use-admin-logout'

export function AdminLogout({
  pending,
  error,
  logout,
}: ReturnType<typeof useAdminLogout>) {
  return (
    <div className="grid gap-3">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Log out failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        variant="ghost"
        className="min-h-11 w-full justify-start"
        disabled={pending}
        aria-busy={pending}
        onClick={() => void logout()}
      >
        {pending ? (
          <RiLoader4Line
            data-icon="inline-start"
            className="animate-spin"
            aria-hidden="true"
          />
        ) : (
          <RiLogoutBoxRLine data-icon="inline-start" aria-hidden="true" />
        )}
        {pending ? 'Logging out...' : 'Log out'}
      </Button>
    </div>
  )
}
