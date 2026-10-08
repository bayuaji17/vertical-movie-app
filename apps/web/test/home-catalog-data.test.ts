import { describe, expect, test } from 'bun:test'
import { catalogData } from '../src/lib/catalog/catalog-data'
import {
  CatalogDataSchema,
  CatalogItemSchema,
} from '../src/lib/catalog/catalog-schema'
import {
  defaultCatalogFilters as defaults,
  getCatalogPage,
  selectCatalog,
  itemLength,
} from '../src/lib/catalog/catalog-selectors'

describe('local catalog fixture', () => {
  test('eighteen unique titles, six of each kind and correct initial order', () => {
    expect(catalogData.items).toHaveLength(18)
    for (const kind of ['movie', 'series', 'standalone'])
      expect(
        catalogData.items.filter((item) => item.kind === kind),
      ).toHaveLength(6)
    expect(getCatalogPage(defaults, 0).items.map((item) => item.title)).toEqual(
      [
        'After the Rain',
        'The Last Train',
        'A Small Beginning',
        'Letters to Home',
        'Midnight Kitchen',
        'City in Motion',
      ],
    )
    expect(Object.isFrozen(catalogData.items[0])).toBe(true)
  })
  test('rejects wrong kind fields, duplicate identity, unknown genres, remote posters and invalid featured item', () => {
    const film = catalogData.items[0]
    for (const invalid of [
      { ...film, episodeCount: 4 },
      { ...film, durationMs: 0 },
      { ...film, poster: 'https://example.com/photo.png' },
    ])
      expect(CatalogItemSchema.safeParse(invalid).success).toBe(false)
    for (const invalid of [
      { ...catalogData, items: [...catalogData.items, film] },
      { ...catalogData, featuredId: 'the-last-train' },
      {
        ...catalogData,
        items: [
          { ...film, genreIds: ['unknown'] },
          ...catalogData.items.slice(1),
        ],
      },
    ])
      expect(CatalogDataSchema.safeParse(invalid).success).toBe(false)
  })
  test('search title or synopsis with canonical whitespace and case; filters combine with AND', () => {
    expect(
      selectCatalog({ ...defaults, search: '  RAIN  ' }).some(
        (item) => item.id === 'after-the-rain',
      ),
    ).toBe(true)
    expect(
      selectCatalog({ ...defaults, search: 'strangers' }).map(
        (item) => item.id,
      ),
    ).toEqual(['after-the-rain'])
    expect(
      selectCatalog({ ...defaults, kind: 'series', genreId: 'comedy' }).map(
        (item) => item.id,
      ),
    ).toEqual(['midnight-kitchen', 'table-for-two'])
    expect(selectCatalog({ ...defaults, genreId: 'missing' })).toHaveLength(0)
  })
  test('stable latest order, complete pagination and empty/EOF termination', () => {
    const pages = [0, 6, 12].map((offset) => getCatalogPage(defaults, offset))
    expect(pages.map((page) => page.nextOffset)).toEqual([6, 12, undefined])
    expect(
      new Set(pages.flatMap((page) => page.items.map((item) => item.id))).size,
    ).toBe(18)
    const tied = catalogData.items.slice(-2)
    expect(
      selectCatalog(defaults, [...tied].reverse()).map((item) => item.id),
    ).toEqual(['morning-on-two-wheels', 'notes-from-the-kitchen'])
    expect(getCatalogPage(defaults, 18).nextOffset).toBeUndefined()
    expect(getCatalogPage(defaults, 0, []).total).toBe(0)
    expect(() => getCatalogPage(defaults, -1)).toThrow()
  })
  test('duration is separate from episode count', () => {
    expect(itemLength(catalogData.items[0])).toBe('18 min')
    expect(itemLength(catalogData.items[1])).toBe('8 episodes')
  })
})
