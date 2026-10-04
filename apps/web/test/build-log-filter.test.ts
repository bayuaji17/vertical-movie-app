import { describe, expect, it, mock } from 'bun:test'

import { filterBuildLog } from '../tooling/log-filter'

type BuildLog = Parameters<typeof filterBuildLog>[1]

function diagnostic(
  id: string | undefined,
  directive = 'use client',
): BuildLog {
  return {
    code: 'MODULE_LEVEL_DIRECTIVE',
    id,
    message: `\u001b[33m[MODULE_LEVEL_DIRECTIVE] \u001b[0mThe semantics of the module level directive "${directive}" in "${id}" may not be preserved when bundling.\n 1 │ "${directive}";`,
  }
}

describe('build diagnostic forwarding', () => {
  it.each([
    '@base-ui/react',
    '@base-ui/utils',
    '@tanstack/react-router',
    '@tanstack/react-query',
    '@tanstack/react-form',
    '@videojs/react',
  ])('filters known use client from %s', (packageName) => {
    const forward = mock((_level: unknown, _log: unknown) => undefined)
    filterBuildLog(
      'warn',
      diagnostic(
        `/repo/node_modules/.bun/vendor/node_modules/${packageName}/index.js`,
      ),
      forward,
    )
    expect(forward).not.toHaveBeenCalled()
  })

  it('filters the compiler runtime directive on a Windows nested path', () => {
    const forward = mock((_level: unknown, _log: unknown) => undefined)
    filterBuildLog(
      'warn',
      diagnostic(
        'C:\\repo\\node_modules\\.bun\\vendor\\node_modules\\react-compiler-runtime\\index.js',
        'use no memo',
      ),
      forward,
    )
    expect(forward).not.toHaveBeenCalled()
  })

  it.each([
    ['/repo/src/ui.tsx', 'use client'],
    ['/repo/node_modules/unreviewed-library/index.js', 'use client'],
    ['/repo/node_modules/@base-ui/react-other/index.js', 'use client'],
    ['/repo/node_modules/@base-ui/react/index.js', 'use server'],
    ['/repo/node_modules/@base-ui/react/index.js', 'use no memo'],
    ['/repo/node_modules/react-compiler-runtime/index.js', 'use client'],
    [
      '/repo/node_modules/@base-ui/react/node_modules/other/index.js',
      'use client',
    ],
    [undefined, 'use client'],
    ['', 'use client'],
  ] as const)('forwards directive %s / %s', (id, directive) => {
    const log = diagnostic(id, directive)
    const forward = mock((_level: unknown, _log: unknown) => undefined)
    filterBuildLog('warn', log, forward)
    expect(forward).toHaveBeenCalledTimes(1)
    expect(forward.mock.calls[0]).toEqual(['warn', log])
    expect(forward.mock.calls[0]?.[1]).toBe(log)
  })

  it.each(['info', 'debug'] as const)(
    'forwards %s without suppressing it',
    (level) => {
      const log = diagnostic('/repo/node_modules/@base-ui/react/index.js')
      const forward = mock((_level: unknown, _log: unknown) => undefined)
      filterBuildLog(level, log, forward)
      expect(forward).toHaveBeenCalledWith(level, log)
    },
  )

  it.each(['UNRESOLVED_IMPORT', 'PLUGIN_ERROR', 'CIRCULAR_DEPENDENCY'])(
    'forwards %s to the existing handler',
    (code) => {
      const log = {
        ...diagnostic('/repo/node_modules/@base-ui/react/index.js'),
        code,
      }
      const forward = mock((_level: unknown, _log: unknown) => undefined)
      filterBuildLog('warn', log, forward)
      expect(forward).toHaveBeenCalledWith('warn', log)
    },
  )

  it('forwards an unrecognized diagnostic format', () => {
    const log = {
      ...diagnostic('/repo/node_modules/@base-ui/react/index.js'),
      message: 'Another diagnostic mentions "use client"',
    }
    const forward = mock((_level: unknown, _log: unknown) => undefined)
    filterBuildLog('warn', log, forward)
    expect(forward).toHaveBeenCalledWith('warn', log)
  })
})
