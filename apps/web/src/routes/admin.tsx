import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeAuthChanges } from '#/lib/auth/transitions'
import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  component: AdminLayout,
})

function AdminLayout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  useEffect(
    () => subscribeAuthChanges(queryClient, () => router.invalidate()),
    [queryClient, router],
  )
  return <Outlet />
}
