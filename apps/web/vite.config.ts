import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

import { filterBuildLog } from './tooling/log-filter'

const config = defineConfig(({ mode }) => {
  const env: Partial<Record<'PORT' | 'HOST', string>> = loadEnv(
    mode,
    process.cwd(),
    ['PORT', 'HOST'],
  )
  const port = Number(process.env.PORT ?? env.PORT ?? 3000)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT harus berupa bilangan bulat antara 1 dan 65535.')
  }

  return {
    resolve: { tsconfigPaths: true },
    build: { rolldownOptions: { onLog: filterBuildLog } },
    server: {
      port,
      host: process.env.HOST ?? env.HOST ?? 'localhost',
      strictPort: true,
    },
    plugins: [
      devtools(),
      nitro({
        preset: 'bun',
        rollupConfig: { external: [/^@sentry\//] },
        rolldownConfig: { onLog: filterBuildLog },
      }),
      tailwindcss(),
      tanstackStart({
        importProtection: {
          behavior: 'error',
          client: { specifiers: ['@repo/auth/server'] },
        },
      }),
      viteReact(),
    ],
  }
})

export default config
