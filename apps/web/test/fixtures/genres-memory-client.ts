import { GenresApiError } from '../../src/lib/admin/genres-client'
import type {
  Genre,
  GenreInput,
  GenresClient,
} from '../../src/lib/admin/genres-client'
import { slugifyGenreName } from '../../src/lib/admin/genres-form'

// Test-only adapter. The live app never uses it, so no persistence is faked.
export function memoryGenresClient(
  seed: Array<Pick<Genre, 'name'> & Partial<Genre>> = [],
  options: { canEdit?: boolean; pageSize?: number; inUse?: string[] } = {},
) {
  let sequence = 0
  const pageSize = options.pageSize ?? 20
  const nextId = () =>
    `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`
  const rows: Genre[] = seed.map((row) => ({
    id: row.id ?? nextId(),
    name: row.name,
    slug: row.slug ?? slugifyGenreName(row.name),
    createdAt: row.createdAt ?? '2026-10-10T00:00:00.000Z',
    updatedAt: row.updatedAt ?? '2026-10-10T00:00:00.000Z',
  }))
  const calls: string[] = []
  const conflict = (slug: string, ignore?: string) =>
    rows.some((row) => row.slug === slug && row.id !== ignore)
  const client: GenresClient = {
    canEdit: options.canEdit ?? true,
    async list(search, cursor) {
      calls.push(`list:${search}:${cursor ?? ''}`)
      const matches = rows.filter((row) =>
        row.name.toLowerCase().includes(search.toLowerCase()),
      )
      const start = cursor ? Number(cursor) : 0
      const items = matches.slice(start, start + pageSize)
      return {
        items,
        nextCursor:
          start + pageSize < matches.length ? String(start + pageSize) : null,
      }
    },
    async create(input: GenreInput) {
      calls.push(`create:${input.name}`)
      const slug = input.slug ?? slugifyGenreName(input.name)
      if (conflict(slug))
        throw new GenresApiError(409, 'SLUG_CONFLICT', 'Slug conflict')
      const row: Genre = {
        id: nextId(),
        name: input.name,
        slug,
        createdAt: '2026-10-10T01:00:00.000Z',
        updatedAt: '2026-10-10T01:00:00.000Z',
      }
      rows.push(row)
      return row
    },
    async rename(id, input) {
      calls.push(`rename:${id}`)
      if (!client.canEdit)
        throw new GenresApiError(501, 'GENRES_EDIT_UNAVAILABLE', 'unavailable')
      const row = rows.find((candidate) => candidate.id === id)
      if (!row) throw new GenresApiError(404, 'GENRE_NOT_FOUND', 'missing')
      const slug = input.slug ?? row.slug
      if (conflict(slug, id))
        throw new GenresApiError(409, 'SLUG_CONFLICT', 'Slug conflict')
      row.name = input.name
      row.slug = slug
      return { ...row }
    },
    async remove(id) {
      calls.push(`remove:${id}`)
      if (!client.canEdit)
        throw new GenresApiError(501, 'GENRES_EDIT_UNAVAILABLE', 'unavailable')
      if (options.inUse?.includes(id))
        throw new GenresApiError(409, 'GENRE_IN_USE', 'in use')
      const index = rows.findIndex((row) => row.id === id)
      if (index < 0) throw new GenresApiError(404, 'GENRE_NOT_FOUND', 'missing')
      rows.splice(index, 1)
    },
  }
  return { client, rows, calls }
}
