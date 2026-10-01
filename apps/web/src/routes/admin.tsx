import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  component: AdminLayout,
})

function AdminLayout() {
  return <Outlet />
}
