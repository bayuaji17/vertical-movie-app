import { createAuthClient as createNativeClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
export { passwordPolicy } from "./internal/policy";
export {
  projectSession,
  isAdminSession,
  AuthDependencyError,
} from "./internal/projection";

export function createAuthClient(
  options: {
    baseURL?: string;
    fetchOptions?: { credentials?: RequestCredentials };
  } = {},
) {
  return createNativeClient({
    ...options,
    plugins: [adminClient()],
    fetchOptions: { credentials: "include", ...options.fetchOptions },
  });
}
export type AuthClient = ReturnType<typeof createAuthClient>;
