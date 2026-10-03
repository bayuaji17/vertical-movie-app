import { createAuthClient as createNativeClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { readSdkSession } from "./internal/sdk-session";
import type { SessionReadOptions } from "./internal/sdk-session";
import type { BetterAuthClientOptions } from "better-auth";
export { passwordPolicy } from "./internal/policy";
export {
  projectSession,
  isAdminSession,
  AuthDependencyError,
} from "./internal/projection";

export function createAuthClient(
  options: {
    baseURL?: string;
    fetchOptions?: BetterAuthClientOptions["fetchOptions"];
  } = {},
) {
  return createNativeClient({
    ...options,
    plugins: [adminClient()],
    fetchOptions: {
      credentials: "include",
      cache: "no-store",
      retry: 0,
      ...options.fetchOptions,
    },
  });
}
export type AuthClient = ReturnType<typeof createAuthClient>;
export function readClientSession(
  client: AuthClient,
  options: SessionReadOptions = {},
) {
  return readSdkSession(
    (signal) =>
      client.getSession({
        query: { disableCookieCache: options.authoritative ?? false },
        fetchOptions: { signal },
      }),
    options,
  );
}
