// Temporary compatibility exports; app composition imports the package directly.
import { eq } from "drizzle-orm";
import { createAdminAuthServer } from "@repo/auth/server";
import * as schema from "../../db/schema";
export {
  isDisabledAuthPath,
  supportedAuthOperations,
  disabledAuthPaths,
} from "@repo/auth/server";
type AuthDatabase = Parameters<typeof createAdminAuthServer>[0]["database"];
export type AdminAuthDependencies = Parameters<
  typeof createAdminAuthServer
>[0] & { isAdminUser?: (id: string) => Promise<boolean> };
export function createAdminAuth(config: AdminAuthDependencies) {
  return createAdminAuthServer(config);
}
export function createAdminPolicy(database: AuthDatabase) {
  return async (userId: string) => {
    const [identity] = await database
      .select({ userId: schema.adminIdentity.userId })
      .from(schema.adminIdentity)
      .where(eq(schema.adminIdentity.userId, userId))
      .limit(1);
    return identity !== undefined;
  };
}
