import { describe, expect, it } from "bun:test";

import { mergeOpenApiResponse } from "./openapi";

describe("OpenAPI auth document merge", () => {
  it("merges paths and component categories without mutating either source", async () => {
    const applicationDocument = {
      openapi: "3.1.1",
      paths: {
        "/": { get: { operationId: "getHealth" } },
      },
      components: {
        schemas: {
          Health: { type: "object" },
        },
        securitySchemes: {
          adminCookie: { type: "apiKey", in: "cookie", name: "admin" },
        },
      },
    };
    const authFragment = {
      openapi: "3.1.1",
      paths: {
        "/api/auth/get-session": {
          get: {
            operationId: "getSession",
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Session" },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Session: { type: "object" },
        },
        securitySchemes: {
          betterAuthSessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "better-auth.session_token",
          },
        },
      },
    };

    const merged = await mergeOpenApiResponse(
      applicationDocument,
      authFragment,
    );

    expect(merged).toEqual({
      openapi: "3.1.1",
      tags: [],
      paths: {
        "/": { get: { operationId: "getHealth" } },
        "/api/auth/get-session": authFragment.paths["/api/auth/get-session"],
      },
      components: {
        schemas: {
          Health: { type: "object" },
          Session: { type: "object" },
        },
        securitySchemes: {
          adminCookie: { type: "apiKey", in: "cookie", name: "admin" },
          betterAuthSessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "better-auth.session_token",
          },
        },
      },
    });
    expect(Object.keys(applicationDocument.paths)).toEqual(["/"]);
    expect(Object.keys(applicationDocument.components.schemas)).toEqual([
      "Health",
    ]);
    expect(Object.keys(authFragment.paths)).toEqual(["/api/auth/get-session"]);
  });

  it("rejects a duplicate path instead of overwriting either operation", async () => {
    await expect(
      mergeOpenApiResponse(
        { paths: { "/api/auth/ok": { get: {} } } },
        { paths: { "/api/auth/ok": { post: {} } } },
      ),
    ).rejects.toThrow("OpenAPI path conflict at /api/auth/ok.");
  });

  it("rejects component-name conflicts per category", async () => {
    await expect(
      mergeOpenApiResponse(
        { paths: {}, components: { schemas: { User: { type: "object" } } } },
        { paths: {}, components: { schemas: { User: { type: "string" } } } },
      ),
    ).rejects.toThrow("OpenAPI component conflict at components.schemas.User.");
  });
});
