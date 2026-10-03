import { createFileRoute } from '@tanstack/react-router'

import { createAuthGateway } from '#/lib/server/auth-gateway'

const gateway = createAuthGateway('auth')
const forward = ({ request }: { request: Request }) => gateway(request)

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      ANY: forward,
    },
  },
})
