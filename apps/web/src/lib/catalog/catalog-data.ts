import fixture from '../../data/catalog.json'
import { CatalogDataSchema } from './catalog-schema'

export const catalogData = CatalogDataSchema.parse(fixture)
for (const item of catalogData.items) {
  Object.freeze(item.genreIds)
  Object.freeze(item)
}
catalogData.genres.forEach(Object.freeze)
Object.freeze(catalogData.items)
Object.freeze(catalogData.genres)
Object.freeze(catalogData)
