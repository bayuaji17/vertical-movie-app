import { createAuthGateway } from './auth-gateway'

export function createBusinessGateway(
  dependencies: Parameters<typeof createAuthGateway>[1] = {},
) {
  return createAuthGateway('business', dependencies)
}
