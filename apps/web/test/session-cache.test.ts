import { describe, expect, it } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'

import { clearAdminPrivateQueries } from '../src/lib/auth/session-cache'

describe('admin session cache cleanup', () => {
  it('removes private auth/admin cache entries while preserving public data', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['auth', 'admin-session'], {
      status: 'authenticated',
    })
    queryClient.setQueryData(['admin', 'videos'], [{ id: 'private-video' }])
    queryClient.setQueryData(['videos', 'published'], [{ id: 'public-video' }])

    await clearAdminPrivateQueries(queryClient)

    expect(queryClient.getQueryData(['auth', 'admin-session'])).toBeUndefined()
    expect(queryClient.getQueryData(['admin', 'videos'])).toBeUndefined()
    expect(queryClient.getQueryData<unknown>(['videos', 'published'])).toEqual([
      { id: 'public-video' },
    ])
    queryClient.clear()
  })
})
