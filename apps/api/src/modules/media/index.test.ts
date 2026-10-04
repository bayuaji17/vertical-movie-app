import { test, expect } from "bun:test";
import { createApp } from "../../app";
import { MediaService } from "./service";
import type { SessionInput } from "@repo/auth/types";
const admin: SessionInput = {
  user: {
    id: "admin",
    name: "Admin",
    email: "admin@example.test",
    role: "admin",
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 60000) },
};
const body = {
  ownerType: "video",
  ownerId: crypto.randomUUID(),
  kind: "source",
  filename: "a.mp4",
  contentType: "video/mp4",
  sizeBytes: "100",
  idempotencyKey: crypto.randomUUID(),
};
const request = (input = body) =>
  new Request("http://localhost/admin/media/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
test("all upload routes require authoritative admin before any storage or domain action", async () => {
  for (const [session, status] of [
    [null, 401],
    [{ ...admin, user: { ...admin.user, role: "user" } }, 403],
  ] as const) {
    const service = new MediaService();
    let calls = 0;
    service.initiate = async () => {
      calls++;
      throw new Error("forbidden");
    };
    service.part = async () => {
      calls++;
      throw new Error("forbidden");
    };
    service.complete = async () => {
      calls++;
      throw new Error("forbidden");
    };
    service.abort = async () => {
      calls++;
      throw new Error("forbidden");
    };
    service.status = async () => {
      calls++;
      throw new Error("forbidden");
    };
    const app = createApp({
      mediaService: service,
      getSession: async () => session,
    });
    expect((await app.handle(request())).status).toBe(status);
    for (const suffix of ["", "/parts", "/complete", "/abort"]) {
      const r = await app.handle(
        new Request(
          "http://localhost/admin/media/uploads/" + body.ownerId + suffix,
          {
            method: suffix ? "POST" : "GET",
            ...(suffix === "/parts"
              ? {
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ partNumber: 1 }),
                }
              : {}),
          },
        ),
      );
      expect(r.status).toBe(status);
    }
    expect(calls).toBe(0);
  }
});
test("strict typed input is rejected before initiate; storage failures remain private", async () => {
  let calls = 0;
  const service = new MediaService();
  service.initiate = async () => {
    calls++;
    throw new Error("private credentials and signed provider URL");
  };
  const app = createApp({
    mediaService: service,
    getSession: async () => admin,
  });
  const bad = await app.handle(
    request({ ...body, objectKey: "sources/attacker" } as typeof body),
  );
  expect(bad.status).toBe(422);
  expect(calls).toBe(0);
  const failed = await app.handle(request());
  expect(failed.status).toBe(500);
  expect(await failed.text()).not.toContain("credentials");
  expect(failed.headers.get("cache-control")).toBe("private, no-store");
});
