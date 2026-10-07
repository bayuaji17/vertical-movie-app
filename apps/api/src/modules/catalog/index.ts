import { Elysia } from "elysia";
import { createContentErrors } from "../../plugins/errors";
import { ErrorResponses } from "../../shared/content-model";
import { CatalogService } from "./service";
import {
  HomeQuerySchema,
  HomeGenresQuery,
  HomePageDto,
  HomeGenresDto,
  HomeFeaturedDto,
} from "./home-model";
import {
  CatalogQuery,
  SlugParams,
  PublicVideoDto,
  PublicVideoListDto,
  PublicSeriesDto,
  PublicSeriesListDto,
} from "./model";
export function createCatalogModule(service = new CatalogService()) {
  return new Elysia({ name: "api.catalog", normalize: false })
    .use(createContentErrors())
    .onBeforeHandle(({ set }) => {
      set.headers["cache-control"] = "private, max-age=60";
    })
    .get("/catalog", ({ query }) => service.home(query), {
      query: HomeQuerySchema,
      response: { 200: HomePageDto, ...ErrorResponses },
      detail: { tags: ["Catalog"], operationId: "listPublicHomeCatalog" },
    })
    .get("/catalog/genres", ({ query }) => service.genres(query), {
      query: HomeGenresQuery,
      response: { 200: HomeGenresDto, ...ErrorResponses },
      detail: { tags: ["Catalog"], operationId: "listPublicHomeGenres" },
    })
    .get("/catalog/featured", () => service.featured(), {
      response: { 200: HomeFeaturedDto, ...ErrorResponses },
      detail: { tags: ["Catalog"], operationId: "getPublicFeaturedFilm" },
    })
    .get("/videos", ({ query }) => service.list(query), {
      query: CatalogQuery,
      response: { 200: PublicVideoListDto, ...ErrorResponses },
      detail: { tags: ["Catalog"], operationId: "listPublicVideos" },
    })
    .get("/videos/:slug", ({ params }) => service.get(params.slug), {
      params: SlugParams,
      response: { 200: PublicVideoDto, ...ErrorResponses },
      detail: { tags: ["Catalog"], operationId: "getPublicVideo" },
    })
    .get("/videos/:slug/next", ({ params }) => service.next(params.slug), {
      params: SlugParams,
      response: { 200: PublicVideoDto, ...ErrorResponses },
      detail: { tags: ["Catalog"], operationId: "getNextPublicEpisode" },
    })
    .get("/series", () => service.series(), {
      response: { 200: PublicSeriesListDto, ...ErrorResponses },
      detail: { tags: ["Catalog"], operationId: "listPublicSeries" },
    })
    .get("/series/:slug", ({ params }) => service.seriesDetail(params.slug), {
      params: SlugParams,
      response: { 200: PublicSeriesDto, ...ErrorResponses },
      detail: { tags: ["Catalog"], operationId: "getPublicSeries" },
    });
}
