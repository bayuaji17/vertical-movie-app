import { toOpenAPISchema } from "@elysia/openapi";
import { supportedAuthOperations } from "../modules/auth";
import type { AuthOpenAPISchema } from "@repo/auth/server";

const AUTH_BASE_PATH = "/api/auth";
const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

type ApplicationOpenAPISchema = ReturnType<typeof toOpenAPISchema>;
type OpenApiObject = Record<string, unknown>;

function isRecord(value: unknown): value is OpenApiObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function operationIdFor(method: string, path: string): string {
  const suffix = path
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, next: string | undefined) =>
      next ? next.toUpperCase() : "",
    );
  return `betterAuth${method[0]?.toUpperCase()}${method.slice(1)}${suffix}`;
}

function getOperationIds(paths: Record<string, unknown>): Set<string> {
  const operationIds = new Set<string>();
  for (const pathItem of Object.values(paths)) {
    if (!isRecord(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isRecord(operation)) continue;
      const { operationId } = operation;
      if (typeof operationId === "string") operationIds.add(operationId);
    }
  }
  return operationIds;
}

function assertNoRouteConflicts(
  applicationSchema: ApplicationOpenAPISchema,
  authPaths: Record<string, unknown>,
): void {
  const applicationPaths = new Set(Object.keys(applicationSchema.paths));
  const applicationOperationIds = getOperationIds(applicationSchema.paths);

  for (const [path, pathItem] of Object.entries(authPaths)) {
    if (applicationPaths.has(path)) {
      throw new Error(`OpenAPI path conflict at ${path}.`);
    }
    if (!isRecord(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isRecord(operation)) continue;
      const { operationId } = operation;
      if (
        typeof operationId === "string" &&
        applicationOperationIds.has(operationId)
      ) {
        throw new Error(`OpenAPI operationId conflict at ${path} (${method}).`);
      }
    }
  }
}

function assertUniqueOperationIds(paths: Record<string, unknown>): void {
  const operationIds = new Map<string, string>();
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!isRecord(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isRecord(operation)) continue;
      const { operationId } = operation;
      if (typeof operationId !== "string") continue;
      const previous = operationIds.get(operationId);
      if (previous) {
        throw new Error(
          `OpenAPI operationId conflict between ${previous} and ${method.toUpperCase()} ${path}.`,
        );
      }
      operationIds.set(operationId, `${method.toUpperCase()} ${path}`);
    }
  }
}

function assertNoComponentConflicts(
  applicationSchema: ApplicationOpenAPISchema,
  authSchema: AuthOpenAPISchema,
): void {
  for (const name of Object.keys(applicationSchema.components.schemas)) {
    if (
      Object.prototype.hasOwnProperty.call(authSchema.components.schemas, name)
    ) {
      throw new Error(
        `OpenAPI component conflict at components.schemas.${name}.`,
      );
    }
  }
}

function isSupportedMethod(
  path: string,
  method: (typeof HTTP_METHODS)[number],
): boolean {
  const supportedMethods = supportedAuthOperations[path];
  if (!supportedMethods) return false;
  if (method === "get" || method === "post") {
    return supportedMethods.includes(method);
  }
  return false;
}

export function createAuthOpenApiFragment(
  applicationSchema: ApplicationOpenAPISchema,
  authSchema: AuthOpenAPISchema,
  secureCookies = false,
): OpenApiObject {
  if (authSchema.openapi !== "3.1.1") {
    throw new Error(
      `Unsupported Better Auth OpenAPI version: ${authSchema.openapi}.`,
    );
  }

  const paths: OpenApiObject = {};
  for (const [authPath, pathItem] of Object.entries(authSchema.paths)) {
    const supportedMethods = supportedAuthOperations[authPath];
    if (!supportedMethods) continue;
    if (
      authPath === AUTH_BASE_PATH ||
      authPath.startsWith(`${AUTH_BASE_PATH}/`)
    ) {
      throw new Error(`Better Auth path already includes ${AUTH_BASE_PATH}.`);
    }

    const transformedPathItem: OpenApiObject = {};
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || !isSupportedMethod(authPath, method)) continue;
      const isPublic = authPath === "/ok" || authPath === "/sign-in/email";
      transformedPathItem[method] = {
        ...operation,
        operationId: operation.operationId || operationIdFor(method, authPath),
        tags: ["Better Auth"],
        security: isPublic ? [] : [{ betterAuthSessionCookie: [] }],
      };
    }
    if (Object.keys(transformedPathItem).length > 0) {
      paths[`${AUTH_BASE_PATH}${authPath}`] = transformedPathItem;
    }
  }

  for (const [path, methods] of Object.entries(supportedAuthOperations)) {
    const pathItem = authSchema.paths[path];
    if (!pathItem) {
      throw new Error(`Better Auth schema is missing supported path ${path}.`);
    }
    for (const method of methods) {
      if (!pathItem[method]) {
        throw new Error(
          `Better Auth schema is missing supported operation ${method.toUpperCase()} ${path}.`,
        );
      }
    }
  }

  assertNoRouteConflicts(applicationSchema, paths);
  assertUniqueOperationIds(paths);
  assertNoComponentConflicts(applicationSchema, authSchema);

  const components: OpenApiObject = {};
  for (const [category, categorySchemas] of Object.entries(
    authSchema.components,
  )) {
    if (category !== "securitySchemes") components[category] = categorySchemas;
  }
  components.securitySchemes = {
    betterAuthSessionCookie: {
      type: "apiKey",
      in: "cookie",
      name: `${secureCookies ? "__Secure-" : ""}better-auth.session_token`,
      description:
        "HttpOnly Better Auth database session cookie. SameSite=Lax; Secure on HTTPS deployments.",
    },
  };

  return {
    openapi: authSchema.openapi,
    tags: [
      {
        name: "Better Auth",
        description: "Email/password authentication and admin session routes.",
      },
    ],
    paths,
    components,
  };
}

function mergeComponents(
  applicationComponents: unknown,
  authComponents: unknown,
): OpenApiObject {
  if (!isRecord(applicationComponents) || !isRecord(authComponents)) {
    throw new Error("OpenAPI components must be objects.");
  }

  const merged: OpenApiObject = { ...applicationComponents };
  for (const [category, authValues] of Object.entries(authComponents)) {
    if (!isRecord(authValues)) {
      throw new Error(`OpenAPI components.${category} must be an object.`);
    }
    const applicationValues = merged[category];
    if (applicationValues !== undefined && !isRecord(applicationValues)) {
      throw new Error(`OpenAPI components.${category} must be an object.`);
    }
    const existingValues = isRecord(applicationValues) ? applicationValues : {};
    for (const name of Object.keys(authValues)) {
      if (Object.prototype.hasOwnProperty.call(existingValues, name)) {
        throw new Error(
          `OpenAPI component conflict at components.${category}.${name}.`,
        );
      }
    }
    merged[category] = { ...existingValues, ...authValues };
  }
  return merged;
}

function mergeOpenApiDocuments(
  applicationDocument: unknown,
  authFragment: OpenApiObject,
): OpenApiObject {
  if (!isRecord(applicationDocument)) {
    throw new Error("Elysia generated an invalid OpenAPI document.");
  }
  const applicationPaths = applicationDocument["paths"];
  const authPaths = authFragment["paths"];
  if (!isRecord(applicationPaths) || !isRecord(authPaths)) {
    throw new Error("OpenAPI paths must be objects.");
  }
  for (const path of Object.keys(authPaths)) {
    if (Object.prototype.hasOwnProperty.call(applicationPaths, path)) {
      throw new Error(`OpenAPI path conflict at ${path}.`);
    }
  }

  const merged: OpenApiObject = {
    ...applicationDocument,
    openapi: authFragment["openapi"],
    tags: [
      ...(Array.isArray(applicationDocument["tags"])
        ? applicationDocument["tags"]
        : []),
      ...(Array.isArray(authFragment["tags"]) ? authFragment["tags"] : []),
    ],
    paths: { ...applicationPaths, ...authPaths },
    components: mergeComponents(
      applicationDocument["components"] ?? {},
      authFragment["components"],
    ),
  };
  return merged;
}

export async function mergeOpenApiResponse(
  response: unknown,
  authFragment: OpenApiObject,
): Promise<unknown> {
  if (response instanceof Response) {
    const document = await response.clone().json();
    const merged = mergeOpenApiDocuments(document, authFragment);
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(JSON.stringify(merged), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  return mergeOpenApiDocuments(response, authFragment);
}
