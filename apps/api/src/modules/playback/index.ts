import { Elysia, t } from "elysia";
import { createContentErrors } from "../../plugins/errors";
import {
  createRequireAdmin,
  type RequireAdminDependencies,
} from "../auth/admin/guard";
import { ErrorResponses, Uuid } from "../../shared/content-model";
import { PlaybackService } from "./service";
const Public = t.Object(
    { slug: t.String({ pattern: "^[a-z0-9]+(-[a-z0-9]+)*$", maxLength: 180 }) },
    { additionalProperties: false },
  ),
  Private = t.Object({ id: Uuid }, { additionalProperties: false });
const Info = t.Object({
  videoId: Uuid,
  title: t.String(),
  durationMs: t.Integer(),
  masterUrl: t.String(),
  posterUrl: t.String(),
  expiresAt: t.String({ format: "date-time" }),
});
export function createPlaybackModule({
  service = new PlaybackService(),
  getSession,
}: RequireAdminDependencies & { service?: PlaybackService }) {
  return new Elysia({ name: "api.playback", normalize: false })
    .use(createContentErrors())
    .use(createRequireAdmin({ getSession }))
    .onBeforeHandle(({ set }) => {
      set.headers["cache-control"] = "private, no-store";
    })
    .get("/videos/:slug/playback", ({ params }) => service.info(params.slug), {
      params: Public,
      response: { 200: Info, ...ErrorResponses },
      detail: { tags: ["Playback"], operationId: "getVideoPlayback" },
    })
    .get(
      "/playback/videos/:slug/master.m3u8",
      ({ params }) => service.playlist(params.slug, undefined),
      {
        params: Public,
        response: { 200: t.String(), ...ErrorResponses },
        detail: { tags: ["Playback"], operationId: "getVideoMasterPlaylist" },
      },
    )
    .get(
      "/playback/videos/:slug/variants/:index",
      ({ params }) => service.playlist(params.slug, params.index),
      {
        params: t.Object({
          ...Public.properties,
          index: t.String({ pattern: "^[0-2]$" }),
        }),
        response: { 200: t.String(), ...ErrorResponses },
        detail: { tags: ["Playback"], operationId: "getVideoVariantPlaylist" },
      },
    )
    .get(
      "/admin/videos/:id/playback",
      ({ params }) => service.info(params.id, true),
      {
        requireAdmin: true,
        params: Private,
        response: { 200: Info, ...ErrorResponses },
        detail: {
          tags: ["Playback"],
          operationId: "getVideoPreview",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    )
    .get(
      "/admin/videos/:id/hls/master.m3u8",
      ({ params }) => service.playlist(params.id, undefined, true),
      {
        requireAdmin: true,
        params: Private,
        response: { 200: t.String(), ...ErrorResponses },
        detail: {
          tags: ["Playback"],
          operationId: "getVideoPreviewMaster",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    )
    .get(
      "/admin/videos/:id/hls/variants/:index",
      ({ params }) => service.playlist(params.id, params.index, true),
      {
        requireAdmin: true,
        params: t.Object({
          ...Private.properties,
          index: t.String({ pattern: "^[0-2]$" }),
        }),
        response: { 200: t.String(), ...ErrorResponses },
        detail: {
          tags: ["Playback"],
          operationId: "getVideoPreviewVariant",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    );
}
