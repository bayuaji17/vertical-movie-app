import { afterAll, describe, expect, it } from "bun:test";
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

import { generateAuthOpenAPISchema } from "@repo/auth/server";
import { createApp } from "../../src/app";
import { createAdminAuth } from "../../src/modules/auth";

const testDatabaseName = "vertical_movie_app_auth_admin_test";
const authOrigin = "http://localhost:3000";

function getTestDatabaseUrl(): string {
  const value = Bun.env.AUTH_ADMIN_TEST_DATABASE_URL;
  if (!value) {
    throw new Error(
      "Set AUTH_ADMIN_TEST_DATABASE_URL to the dedicated local admin test database.",
    );
  }

  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(value);
  } catch {
    throw new Error(
      "AUTH_ADMIN_TEST_DATABASE_URL must be a valid local PostgreSQL URL.",
    );
  }
  if (
    !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      parsedDatabaseUrl.hostname,
    ) ||
    parsedDatabaseUrl.pathname !== `/${testDatabaseName}`
  ) {
    throw new Error(
      `Refusing to connect to a database other than ${testDatabaseName} on localhost.`,
    );
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPointerValue(root: unknown, reference: string): unknown {
  if (!reference.startsWith("#/")) return undefined;
  let value = root;
  for (const part of reference
    .slice(2)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (isRecord(value)) {
      value = value[part];
    } else if (Array.isArray(value)) {
      value = value[Number(part)];
    } else {
      return undefined;
    }
  }
  return value;
}

function collectReferences(
  value: unknown,
  references: string[] = [],
): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, references);
  } else if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && typeof child === "string") references.push(child);
      else collectReferences(child, references);
    }
  }
  return references;
}

const databaseUrl = getTestDatabaseUrl();
const client = new SQL(databaseUrl);
const database = drizzle({ client });
const auth = createAdminAuth({
  database,
  origin: authOrigin,
  secret: "auth-openapi-proof-secret-never-use-outside-this-test",
  secureCookies: false,
  isAdminUser: async () => false,
});
const authOpenApiSchema = await generateAuthOpenAPISchema(auth);
const originalAuthSchema = JSON.stringify(authOpenApiSchema);
const app = createApp({
  auth,
  authOpenApiSchema,
  admin: {
    getSession: async () => null,
    isAdminUser: async () => false,
  },
});
const secureApp = createApp({
  auth,
  authOpenApiSchema,
  secureCookies: true,
  admin: {
    getSession: async () => null,
    isAdminUser: async () => false,
  },
});

afterAll(async () => {
  await client.close();
});

describe("AUTH-008 combined OpenAPI and Scalar", () => {
  it("serves one 3.1.1 document with active app and auth routes", async () => {
    const response = await app.handle(
      new Request(`${authOrigin}/openapi/json`),
    );
    expect(response.status).toBe(200);
    expect(JSON.stringify(authOpenApiSchema)).toBe(originalAuthSchema);
    const document: unknown = await response.json();
    expect(isRecord(document)).toBe(true);
    if (!isRecord(document)) throw new Error("Expected an OpenAPI object.");

    const paths = document["paths"];
    expect(isRecord(paths)).toBe(true);
    if (!isRecord(paths)) throw new Error("Expected OpenAPI paths.");
    expect(paths["/"]).toBeDefined();
    expect(paths["/admin/session"]).toBeDefined();
    expect(paths["/api/auth/ok"]).toBeDefined();
    expect(paths["/api/auth/get-session"]).toBeDefined();
    expect(paths["/api/auth/sign-in/email"]).toBeDefined();
    expect(paths["/api/auth/sign-out"]).toBeDefined();
    expect(paths["/api/auth/sign-up/email"]).toBeUndefined();
    expect(paths["/api/auth/open-api/generate-schema"]).toBeUndefined();
    expect(
      Object.keys(paths).some((path) => path.startsWith("/api/auth/api/auth/")),
    ).toBe(false);
    expect(document["openapi"]).toBe("3.1.1");
    expect(document["security"]).toBeUndefined();
    expect(document["servers"]).toBeUndefined();

    const components = document["components"];
    expect(isRecord(components)).toBe(true);
    if (!isRecord(components)) throw new Error("Expected OpenAPI components.");
    const securitySchemes = components["securitySchemes"];
    expect(isRecord(securitySchemes)).toBe(true);
    if (!isRecord(securitySchemes)) {
      throw new Error("Expected OpenAPI security schemes.");
    }
    expect(securitySchemes["betterAuthSessionCookie"]).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "better-auth.session_token",
    });
    expect(securitySchemes["bearerAuth"]).toBeUndefined();

    const signInPath = paths["/api/auth/sign-in/email"];
    const getSessionPath = paths["/api/auth/get-session"];
    const adminPath = paths["/admin/session"];
    expect(isRecord(signInPath)).toBe(true);
    expect(isRecord(getSessionPath)).toBe(true);
    expect(isRecord(adminPath)).toBe(true);
    if (
      !isRecord(signInPath) ||
      !isRecord(getSessionPath) ||
      !isRecord(adminPath)
    ) {
      throw new Error("Expected documented route objects.");
    }
    const signIn = signInPath["post"];
    const getSession = getSessionPath["get"];
    const adminSession = adminPath["get"];
    expect(isRecord(signIn)).toBe(true);
    expect(isRecord(getSession)).toBe(true);
    expect(isRecord(adminSession)).toBe(true);
    if (!isRecord(signIn) || !isRecord(getSession) || !isRecord(adminSession)) {
      throw new Error("Expected documented operations.");
    }
    expect(signIn["security"]).toEqual([]);
    expect(signIn["tags"]).toEqual(["Better Auth"]);
    expect(Object.keys(signInPath)).toEqual(["post"]);
    expect(Object.keys(getSessionPath).sort()).toEqual(["get", "post"]);
    expect(Object.keys(adminPath)).toEqual(["get"]);
    const healthPath = paths["/"];
    const okPath = paths["/api/auth/ok"];
    const signOutPath = paths["/api/auth/sign-out"];
    expect(isRecord(healthPath)).toBe(true);
    expect(isRecord(okPath)).toBe(true);
    expect(isRecord(signOutPath)).toBe(true);
    if (!isRecord(healthPath) || !isRecord(okPath) || !isRecord(signOutPath)) {
      throw new Error("Expected public and logout operations.");
    }
    const health = healthPath["get"];
    const ok = okPath["get"];
    const signOut = signOutPath["post"];
    expect(isRecord(health)).toBe(true);
    expect(isRecord(ok)).toBe(true);
    expect(isRecord(signOut)).toBe(true);
    if (!isRecord(health) || !isRecord(ok) || !isRecord(signOut)) {
      throw new Error("Expected public and logout operations.");
    }
    expect(health["security"]).toBeUndefined();
    expect(ok["security"]).toEqual([]);
    expect(signOut["security"]).toEqual([{ betterAuthSessionCookie: [] }]);
    expect(getSession["security"]).toEqual([{ betterAuthSessionCookie: [] }]);
    expect(adminSession["security"]).toEqual([{ betterAuthSessionCookie: [] }]);
    expect(adminSession["operationId"]).toBe("getAdminSession");

    const references = collectReferences(document);
    for (const reference of references) {
      if (reference.startsWith("#/")) {
        expect(getPointerValue(document, reference)).toBeDefined();
      }
    }

    const operationIds: string[] = [];
    for (const pathItem of Object.values(paths)) {
      if (!isRecord(pathItem)) continue;
      for (const operation of Object.values(pathItem)) {
        if (!isRecord(operation)) continue;
        const operationId = operation["operationId"];
        if (typeof operationId === "string") operationIds.push(operationId);
      }
    }
    expect(new Set(operationIds).size).toBe(operationIds.length);
  });

  it("serves Scalar and keeps disabled auth operations unavailable", async () => {
    const scalarResponse = await app.handle(
      new Request(`${authOrigin}/openapi`),
    );
    expect(scalarResponse.status).toBe(200);
    expect(scalarResponse.headers.get("content-type")).toContain("text/html");
    expect(await scalarResponse.text()).toContain("openapi/json");

    const authHealthResponse = await app.handle(
      new Request(`${authOrigin}/api/auth/ok`),
    );
    expect(authHealthResponse.status).toBe(200);
    expect(await authHealthResponse.json()).toEqual({ ok: true });

    const secureDocumentResponse = await secureApp.handle(
      new Request(`${authOrigin}/openapi/json`),
    );
    const secureDocument: unknown = await secureDocumentResponse.json();
    expect(isRecord(secureDocument)).toBe(true);
    if (!isRecord(secureDocument)) {
      throw new Error("Expected a secure OpenAPI object.");
    }
    const secureComponents = secureDocument["components"];
    expect(isRecord(secureComponents)).toBe(true);
    if (!isRecord(secureComponents)) {
      throw new Error("Expected secure OpenAPI components.");
    }
    const secureSchemes = secureComponents["securitySchemes"];
    expect(isRecord(secureSchemes)).toBe(true);
    if (!isRecord(secureSchemes)) {
      throw new Error("Expected secure OpenAPI security schemes.");
    }
    expect(secureSchemes["betterAuthSessionCookie"]).toMatchObject({
      name: "__Secure-better-auth.session_token",
    });

    const signUpResponse = await app.handle(
      new Request(`${authOrigin}/api/auth/sign-up/email`, {
        method: "POST",
      }),
    );
    expect(signUpResponse.status).toBe(404);
    const authReferenceResponse = await app.handle(
      new Request(`${authOrigin}/api/auth/reference`),
    );
    expect(authReferenceResponse.status).toBe(404);
    const wrongMethodResponse = await app.handle(
      new Request(`${authOrigin}/api/auth/sign-in/email`),
    );
    expect(wrongMethodResponse.status).toBe(404);
  });
});
