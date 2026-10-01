import { describe, expect, it } from 'bun:test'

import {
  normalizeLoginEmail,
  signInErrorMessage,
  validateAdminRedirect,
  validateLoginEmail,
  validateLoginPassword,
} from '../src/lib/auth/login'

describe('admin login input and return target', () => {
  it('keeps only same-origin admin destinations and preserves their query/hash', () => {
    expect(validateAdminRedirect('/admin')).toBe('/admin')
    expect(validateAdminRedirect('/admin/videos?page=2#latest')).toBe(
      '/admin/videos?page=2#latest',
    )
  })

  it('falls back safely for external, malformed, public, and looping destinations', () => {
    for (const value of [
      'https://attacker.example/admin',
      '//attacker.example/admin',
      '/videos',
      '/admin/login',
      '/admin/login?redirect=/admin',
      '/\\attacker.example',
      undefined,
      '/admin/\u0000bad',
    ]) {
      expect(validateAdminRedirect(value)).toBe('/admin')
    }
  })

  it('normalizes and validates the provisioned administrator credentials', () => {
    expect(normalizeLoginEmail('  ADMIN@EXAMPLE.COM  ')).toBe(
      'admin@example.com',
    )
    expect(validateLoginEmail('admin@example.com')).toBeUndefined()
    expect(validateLoginEmail('not-an-email')).toBeString()
    expect(validateLoginPassword('a'.repeat(12))).toBeUndefined()
    expect(validateLoginPassword('short')).toBeString()
    expect(validateLoginPassword('x'.repeat(129))).toBeString()
  })

  it('maps server and network errors to safe user messages', () => {
    expect(signInErrorMessage({ status: 401, message: 'secret details' })).toBe(
      'Email atau password tidak cocok.',
    )
    expect(signInErrorMessage({ status: 403 })).toBe(
      'Akun ini tidak memiliki akses admin.',
    )
    expect(signInErrorMessage({ status: 429 })).toContain('Terlalu banyak')
    expect(
      signInErrorMessage(new TypeError('private network detail')),
    ).toContain('tidak dapat dihubungi')
  })
})
