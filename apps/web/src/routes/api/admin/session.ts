import { createFileRoute } from '@tanstack/react-router'

import { createAuthGateway } from '#/lib/server/auth-gateway'

const gateway = createAuthGateway('admin-session')

export const Route = createFileRoute('/api/admin/session')({
  server: {
    handlers: {
      GET: ({ request }) => gateway(request),
    },
  },
})
