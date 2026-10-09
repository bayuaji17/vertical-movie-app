import { Elysia, t } from "elysia";
import { createContentErrors } from "../../plugins/errors";
import { ErrorResponses } from "../../shared/content-model";
import { invalid } from "../../shared/content-error";
import { createRequireAdmin } from "../auth/admin/guard";
import type { RequireAdminDependencies } from "../auth/admin/guard";
import { SettingsService } from "./service";
import {
  publicFields,
  SettingsPublicDto,
  SettingsPrivateDto,
  SettingsSaveBody,
} from "./model";
async function parseSave({ request }: { request: Request }) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    return invalid("Use application/json for settings.");
  const reader = request.body?.getReader();
  if (!reader) return invalid("Settings input is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) {
        await reader.cancel();
        return invalid("Settings input is too large.");
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      body.set(c, offset);
      offset += c.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return invalid("Settings input is invalid.");
  } finally {
    reader.releaseLock();
  }
}
export function createSettingsModule({
  service = new SettingsService(),
  getSession,
}: RequireAdminDependencies & { service?: SettingsService }) {
  const publicModule = new Elysia({
    name: "api.settings.public",
    normalize: false,
  })
    .use(createContentErrors())
    .onBeforeHandle(({ set }) => {
      set.headers["cache-control"] = "private, no-store";
    })
    .get(
      "/site-settings",
      async ({ request }) => {
        const { item, freshForMs } = await service.snapshot(
          false,
          request.signal,
        );
        return {
          item: publicFields(item),
          version: item.rowVersion,
          freshForMs,
        };
      },
      {
        query: t.Object({}, { additionalProperties: false }),
        response: { 200: SettingsPublicDto, ...ErrorResponses },
        detail: {
          tags: ["Settings"],
          operationId: "getPublicSiteSettings",
          summary: "Read public site text from the shared settings snapshot",
        },
      },
    );
  const privateModule = new Elysia({
    name: "api.settings.private",
    normalize: false,
  })
    .use(createContentErrors())
    .use(createRequireAdmin({ getSession }))
    .onBeforeHandle(({ set }) => {
      set.headers["cache-control"] = "private, no-store";
    })
    .get(
      "/admin/settings",
      ({ query, request }) =>
        service.snapshot(query.fresh === "1", request.signal),
      {
        requireAdmin: true,
        query: t.Object(
          { fresh: t.Optional(t.Literal("1")) },
          { additionalProperties: false },
        ),
        response: { 200: SettingsPrivateDto, ...ErrorResponses },
        detail: {
          tags: ["Settings"],
          operationId: "getAdminSiteSettings",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    )
    .patch(
      "/admin/settings",
      async ({ body }) => {
        const item = await service.save(body);
        return service.cache.peek() ?? { item, freshForMs: 0 };
      },
      {
        parse: parseSave,
        requireAdmin: true,
        query: t.Object({}, { additionalProperties: false }),
        body: SettingsSaveBody,
        response: { 200: SettingsPrivateDto, ...ErrorResponses },
        detail: {
          tags: ["Settings"],
          operationId: "saveAdminSiteSettings",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    );
  return new Elysia({ name: "api.settings" })
    .use(publicModule)
    .use(privateModule);
}
