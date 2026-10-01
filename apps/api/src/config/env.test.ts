import { describe, expect, it } from "bun:test";

import { loadApiEnv, loadDatabaseUrl } from "./env";

const validEnv = {
  DATABASE_URL:
    "postgresql://postgres:postgres@localhost:5432/vertical_movie_app",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-thirty-two-characters",
  WEB_ORIGIN: "http://localhost:3000",
};

describe("loadApiEnv", () => {
  it("loads PostgreSQL settings and normalizes valid local origins", () => {
    expect(loadApiEnv({ ...validEnv, PORT: "3100" })).toEqual({
      port: 3100,
      databaseUrl: validEnv.DATABASE_URL,
      betterAuthUrl: "http://localhost:3000",
      betterAuthSecret: validEnv.BETTER_AUTH_SECRET,
      webOrigin: "http://localhost:3000",
    });
  });

  it("uses the documented API port by default", () => {
    expect(loadApiEnv(validEnv).port).toBe(3001);
  });

  it("rejects an invalid port without exposing configuration values", () => {
    expect(() => loadApiEnv({ ...validEnv, PORT: "70000" })).toThrow("PORT");
    expect(() => loadApiEnv({ ...validEnv, PORT: "3e3" })).toThrow("PORT");
  });

  it("requires a PostgreSQL connection URL", () => {
    expect(() => loadApiEnv({ ...validEnv, DATABASE_URL: undefined })).toThrow(
      "DATABASE_URL",
    );
    expect(() =>
      loadApiEnv({ ...validEnv, DATABASE_URL: "mysql://localhost/app" }),
    ).toThrow("PostgreSQL");
    expect(() =>
      loadApiEnv({ ...validEnv, DATABASE_URL: "postgresql:///app" }),
    ).toThrow("PostgreSQL");
  });

  it("rejects missing and short auth secrets", () => {
    expect(() =>
      loadApiEnv({ ...validEnv, BETTER_AUTH_SECRET: undefined }),
    ).toThrow("BETTER_AUTH_SECRET");
    expect(() =>
      loadApiEnv({ ...validEnv, BETTER_AUTH_SECRET: "short" }),
    ).toThrow("BETTER_AUTH_SECRET");
  });

  it("requires the Better Auth and web origins to match", () => {
    expect(() =>
      loadApiEnv({ ...validEnv, BETTER_AUTH_URL: "http://localhost:3001" }),
    ).toThrow("origin");
  });

  it("requires HTTPS origins outside local development", () => {
    expect(() =>
      loadApiEnv({
        ...validEnv,
        BETTER_AUTH_URL: "http://example.com",
        WEB_ORIGIN: "http://example.com",
      }),
    ).toThrow("HTTPS");
  });

  it("rejects public origins with paths or credentials", () => {
    expect(() =>
      loadApiEnv({
        ...validEnv,
        BETTER_AUTH_URL: "http://localhost:3000/path",
        WEB_ORIGIN: "http://localhost:3000/path",
      }),
    ).toThrow("origin");
  });

  it("does not include secret or database credentials in validation errors", () => {
    const secret = "private-test-secret-that-must-not-appear";
    const databaseUrl =
      "postgresql://private-user:private-password@localhost/app";
    let message: string | undefined;

    try {
      loadApiEnv({
        ...validEnv,
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_SECRET: secret,
        WEB_ORIGIN: "not-an-origin",
      });
    } catch (error) {
      if (error instanceof Error) message = error.message;
    }

    expect(message).toBe("WEB_ORIGIN harus berupa origin HTTP(S) yang valid.");
    expect(message).not.toContain(secret);
    expect(message).not.toContain(databaseUrl);
    expect(message).not.toContain("private-password");
  });
});

describe("loadDatabaseUrl", () => {
  it("validates the database URL without requiring auth secrets", () => {
    expect(loadDatabaseUrl({ DATABASE_URL: validEnv.DATABASE_URL })).toBe(
      validEnv.DATABASE_URL,
    );
  });

  it("rejects missing or non-PostgreSQL URLs without including their values", () => {
    expect(() => loadDatabaseUrl({})).toThrow("DATABASE_URL");
    expect(() =>
      loadDatabaseUrl({ DATABASE_URL: "mysql://private.example/app" }),
    ).toThrow("PostgreSQL");
  });
});
