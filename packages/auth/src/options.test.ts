import { describe, expect, it } from "bun:test";
import { createAuthOptions } from "./internal/options";
import { createAuthClient, passwordPolicy } from "./client";

describe("configured native auth boundary", () => {
  it("uses explicit configuration, native admin and fixed auth policy", () => {
    const options = createAuthOptions({
      origin: "http://localhost:3000",
      secret: "fixture-only-secret-longer-than-thirty-two",
      secureCookies: false,
    });
    expect(options.plugins.map((plugin) => plugin.id)).toContain("admin");
    expect(options.emailAndPassword.disableSignUp).toBe(true);
    expect(options.emailAndPassword.minPasswordLength).toBe(
      passwordPolicy.minLength,
    );
    expect(options.trustedOrigins).toEqual(["http://localhost:3000"]);
    expect(options.session.cookieCache.maxAge).toBe(60);
    expect(options.session.disableSessionRefresh).toBe(true);
  });
  it("creates client SDK without contacting a server", () => {
    const client = createAuthClient({ baseURL: "http://localhost:3000" });
    expect(typeof client.signIn.email).toBe("function");
    expect(typeof client.admin.setRole).toBe("function");
  });
});
