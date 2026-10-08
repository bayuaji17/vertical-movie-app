import { expect, test } from "bun:test";
import type { SessionInput } from "@repo/auth/types";
import { createApp } from "../../app";
import { ContentError } from "../../shared/content-error";
import { PublicationService } from "./service";
import { readinessCodes, seriesReadinessCodes } from "./readiness";
const id = "00000000-0000-4000-8000-000000000001";
const admin: SessionInput = {
  user: {
    id: "admin",
    name: "Admin",
    email: "a@example.test",
    role: "admin",
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 60000) },
};
const dto = {
  videoId: id,
  kind: "movie" as const,
  rowVersion: 1,
  publicationStatus: "draft" as const,
  archivedAt: null,
  canPublish: false,
  checks: readinessCodes.map((code) => ({ code, status: "blocked" as const })),
};
const request = (value = id) =>
  new Request(
    "http://localhost/admin/videos/" + value + "/publication-readiness",
  );
test("readiness guard runs before assessment, including expired and dependency failure", async () => {
  for (const [session, status] of [
    [null, 401],
    [{ ...admin, user: { ...admin.user, role: "user" } }, 403],
    [{ ...admin, session: { expiresAt: new Date(0) } }, 401],
  ] as const) {
    const service = new PublicationService();
    let calls = 0;
    service.readiness = async () => {
      calls++;
      return dto;
    };
    const app = createApp({
      getSession: async () => session,
      publicationService: service,
    });
    const response = await app.handle(request());
    expect(response.status).toBe(status);
    expect(calls).toBe(0);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
  const response = await createApp({
    getSession: async () => {
      throw Error("private");
    },
  }).handle(request());
  expect(response.status).toBe(503);
});
test("readiness response is whitelisted and uncached, invalid UUID does not call assessment", async () => {
  const service = new PublicationService();
  let calls = 0;
  service.readiness = async () => {
    calls++;
    return dto;
  };
  const app = createApp({
    getSession: async () => admin,
    publicationService: service,
  });
  const response = await app.handle(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(dto);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect((await app.handle(request("bad"))).status).toBe(422);
  expect(calls).toBe(1);
});
test("missing row and unavailable dependencies are failures rather than blocked readiness", async () => {
  const service = new PublicationService();
  service.readiness = async () => {
    throw new ContentError("CONTENT_NOT_FOUND", "Missing", 404);
  };
  const app = createApp({
    getSession: async () => admin,
    publicationService: service,
  });
  const response = await app.handle(request());
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const offline = await createApp({ getSession: async () => admin }).handle(
    request(),
  );
  expect(offline.status).toBe(503);
  expect((await offline.json()).error.code).toBe(
    "CONTENT_DEPENDENCY_UNAVAILABLE",
  );
});
test("Scalar includes secured GET and public routes stay public", async () => {
  const app = createApp();
  const response = await app.handle(
    new Request("http://localhost/openapi/json"),
  );
  const schema = await response.json();
  const get = schema.paths["/admin/videos/{id}/publication-readiness"].get;
  expect(get.operationId).toBe("videoPublicationReadiness");
  expect(get.security).toEqual([{ betterAuthSessionCookie: [] }]);
  expect(get.responses["200"]).toBeDefined();
  expect((await app.handle(new Request("http://localhost/"))).status).toBe(200);
});

test("Series readiness uses private admin guard, strict UUID, safe DTO, errors and secured OpenAPI", async () => {
  const dto = {
    seriesId: id,
    ownerType: "series" as const,
    rowVersion: 2,
    publicationStatus: "draft" as const,
    archivedAt: null,
    canPublish: false,
    checks: seriesReadinessCodes.map((code) => ({
      code,
      status: "blocked" as const,
    })),
  };
  const request = (value = id) =>
    new Request(
      "http://localhost/admin/series/" + value + "/publication-readiness",
    );
  for (const [session, status] of [
    [null, 401],
    [{ ...admin, user: { ...admin.user, role: "user" } }, 403],
    [{ ...admin, session: { expiresAt: new Date(0) } }, 401],
    [admin, 200],
  ] as const) {
    const service = new PublicationService();
    let calls = 0;
    service.seriesReadiness = async () => {
      calls++;
      return dto;
    };
    const app = createApp({
      getSession: async () => session,
      publicationService: service,
    });
    const response = await app.handle(request());
    expect(response.status).toBe(status);
    expect(calls).toBe(status === 200 ? 1 : 0);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    if (status === 200) {
      expect(await response.json()).toEqual(dto);
      expect((await app.handle(request("bad"))).status).toBe(422);
      expect(calls).toBe(1);
    }
  }
  expect(
    (
      await createApp({
        getSession: async () => {
          throw Error("hidden");
        },
      }).handle(request())
    ).status,
  ).toBe(503);
  expect(
    (await createApp({ getSession: async () => admin }).handle(request()))
      .status,
  ).toBe(503);
  const service = new PublicationService();
  service.seriesReadiness = async () => {
    throw new ContentError("CONTENT_NOT_FOUND", "Missing", 404);
  };
  expect(
    (
      await createApp({
        getSession: async () => admin,
        publicationService: service,
      }).handle(request())
    ).status,
  ).toBe(404);
  const schema = await (
    await createApp().handle(new Request("http://localhost/openapi/json"))
  ).json();
  const get = schema.paths["/admin/series/{id}/publication-readiness"].get;
  expect(get.operationId).toBe("seriesPublicationReadiness");
  expect(get.security).toEqual([{ betterAuthSessionCookie: [] }]);
  expect(get.responses["200"]).toBeDefined();
});
