import { createFileRoute } from '@tanstack/react-router'
import { createBusinessGateway } from '#/lib/server/business-gateway'

const gateway = createBusinessGateway()
export const Route = createFileRoute('/api/$')({
  server: { handlers: { ANY: ({ request }) => gateway(request) } },
})
