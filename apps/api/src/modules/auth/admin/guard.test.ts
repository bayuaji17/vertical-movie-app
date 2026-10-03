import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { createRequireAdmin } from "./guard";
import type { SessionInput } from "@repo/auth/types";

const valid: SessionInput = {
  user: {
    id: "fixture",
    name: "Admin",
    email: "admin@example.test",
    role: "admin",
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 60_000) },
};
describe("authoritative admin macro", () => {
  for (const [name, input, code] of [
    ["missing", null, 401],
    ["expired", { ...valid, session: { expiresAt: new Date(0) } }, 401],
    ["non-admin", { ...valid, user: { ...valid.user, role: "user" } }, 403],
    ["banned", { ...valid, user: { ...valid.user, banned: true } }, 403],
    ["admin", valid, 200],
  ] as const) {
    it(`checks ${name} before calling the service`, async () => {
      let calls = 0;
      const app = new Elysia()
        .use(
          createRequireAdmin({
            getSession: async (options) => {
              expect(options.query.disableCookieCache).toBe(true);
              return input;
            },
          }),
        )
        .get("/public", () => "public")
        .post(
          "/private",
          () => {
            calls++;
            return "private";
          },
          { requireAdmin: true },
        );
      expect(
        (await app.handle(new Request("http://localhost/public"))).status,
      ).toBe(200);
      const response = await app.handle(
        new Request("http://localhost/private", { method: "POST" }),
      );
      expect(response.status).toBe(code);
      expect(calls).toBe(code === 200 ? 1 : 0);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    });
  }
  it("keeps public routes available and masks dependency failures", async () => {
    const app = new Elysia()
      .use(
        createRequireAdmin({
          getSession: async () => {
            throw new Error("private SQL detail");
          },
        }),
      )
      .get("/", () => "public")
      .get("/private", () => "never", { requireAdmin: true });
    expect((await app.handle(new Request("http://localhost/"))).status).toBe(
      200,
    );
    const denied = await app.handle(new Request("http://localhost/private"));
    expect(denied.status).toBe(503);
    expect(await denied.text()).not.toContain("private SQL detail");
  });
});
