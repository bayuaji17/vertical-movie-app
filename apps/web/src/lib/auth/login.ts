import { sessionQueryKey } from './session-cache'

export const adminSessionQueryKey = sessionQueryKey

const ADMIN_LOGIN_PATH = '/admin/login'

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0)
    return code <= 0x1f || code === 0x7f
  })
}

export function validateAdminRedirect(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    hasControlCharacter(value)
  ) {
    return '/admin'
  }

  try {
    const target = new URL(value, 'https://admin.invalid')
    if (
      target.origin !== 'https://admin.invalid' ||
      !(
        target.pathname === '/admin' || target.pathname.startsWith('/admin/')
      ) ||
      target.pathname === ADMIN_LOGIN_PATH ||
      target.pathname.startsWith(`${ADMIN_LOGIN_PATH}/`)
    ) {
      return '/admin'
    }

    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return '/admin'
  }
}

export function normalizeLoginEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function validateLoginEmail(value: string): string | undefined {
  const email = normalizeLoginEmail(value)
  if (!email) return 'Masukkan alamat email.'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    return 'Masukkan alamat email yang valid.'
  }
  return undefined
}

export function validateLoginPassword(value: string): string | undefined {
  if (!value) return 'Masukkan password.'
  if (value.length < 12 || value.length > 128) {
    return 'Password harus terdiri dari 12–128 karakter.'
  }
  return undefined
}

function statusFromError(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined
  }
  const status = error.status
  return typeof status === 'number' ? status : undefined
}

export function signInErrorMessage(error: unknown): string {
  const status = statusFromError(error)
  if (status === 429) {
    return 'Terlalu banyak percobaan login. Tunggu sebentar, lalu coba lagi.'
  }
  if (status === 401) {
    return 'Email atau password tidak cocok.'
  }
  if (status === 403) {
    return 'Akun ini tidak memiliki akses admin.'
  }
  if (status === undefined || status >= 500) {
    return 'Layanan autentikasi sedang tidak dapat dihubungi. Coba lagi.'
  }
  return 'Login belum dapat diproses. Periksa data dan coba lagi.'
}

export function logoutErrorMessage(error: unknown): string {
  const status = statusFromError(error)
  if (status === 429) {
    return 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba logout lagi.'
  }
  if (status === undefined || status >= 500) {
    return 'Layanan autentikasi tidak dapat dihubungi. Sesi belum dapat dipastikan berakhir.'
  }
  return 'Sesi belum dapat ditutup. Coba lagi.'
}
