import type { BuildOptions } from 'vite'

type BuildLogHandler = NonNullable<
  NonNullable<BuildOptions['rolldownOptions']>['onLog']
>

const clientDirectivePackages = new Set([
  '@base-ui/react',
  '@base-ui/utils',
  '@tanstack/react-router',
  '@tanstack/react-query',
  '@tanstack/react-form',
  '@videojs/react',
])

// These directives are not consumed by the current SSR pipeline. Review this
// allowlist before enabling RSC/React Compiler or changing these dependencies.
export const filterBuildLog: BuildLogHandler = (level, log, defaultHandler) => {
  if (level === 'warn' && log.code === 'MODULE_LEVEL_DIRECTIVE' && log.id) {
    const normalizedId = log.id.replaceAll('\\', '/')
    const packagePath = normalizedId.split('/node_modules/').at(-1)
    const isDependency = normalizedId.includes('/node_modules/')
    const packageName = packagePath?.startsWith('@')
      ? packagePath.split('/').slice(0, 2).join('/')
      : packagePath?.split('/')[0]
    const header = Bun.stripANSI(log.message).split('\n')[0]
    const directive = header
      .match(
        /^(?:\[MODULE_LEVEL_DIRECTIVE\]\s*)?The semantics of the module level directive "([^"]+)" in "[^"]+" may not be preserved when bundling\./,
      )
      ?.at(1)

    if (
      isDependency &&
      packageName &&
      ((directive === 'use client' &&
        clientDirectivePackages.has(packageName)) ||
        (directive === 'use no memo' &&
          packageName === 'react-compiler-runtime'))
    ) {
      return
    }
  }

  defaultHandler(level, log)
}
