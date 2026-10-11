import { createLogger } from '@repo/log'

/** Server-side logger for the web process (gateway and SSR reads). */
export const webLog = createLogger('web')
