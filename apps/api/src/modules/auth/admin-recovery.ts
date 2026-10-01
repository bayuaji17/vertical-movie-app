import { and, eq, sql } from "drizzle-orm";
import type { BunSQLDatabase } from "drizzle-orm/bun-sql";

import { hashPassword } from "@repo/auth/server";
import * as schema from "../../db/schema";
import { validateAdminPassword } from "./admin-provision";

type RecoveryDatabase = BunSQLDatabase<typeof schema>;

export type ResetAdminPasswordResult = {
  userId: string;
  revokedSessions: number;
};

export class AdminRecoveryUnavailableError extends Error {
  constructor() {
    super("The configured administrator credential is unavailable.");
    this.name = "AdminRecoveryUnavailableError";
  }
}

export async function resetAdminPassword(
  database: RecoveryDatabase,
  input: { password: string },
): Promise<ResetAdminPasswordResult> {
  validateAdminPassword(input.password);
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  return database.transaction(async (transaction) => {
    // Keep recovery serialized with provisioning and any concurrent recovery.
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(1481985763, 1)`);

    const [identity] = await transaction
      .select({ userId: schema.adminIdentity.userId })
      .from(schema.adminIdentity)
      .where(eq(schema.adminIdentity.id, "primary"))
      .limit(1);
    if (!identity) throw new AdminRecoveryUnavailableError();

    const credentials = await transaction
      .update(schema.account)
      .set({ password: passwordHash, updatedAt: now })
      .where(
        and(
          eq(schema.account.userId, identity.userId),
          eq(schema.account.providerId, "credential"),
        ),
      )
      .returning({ id: schema.account.id });
    if (credentials.length === 0) throw new AdminRecoveryUnavailableError();

    const sessions = await transaction
      .delete(schema.session)
      .where(eq(schema.session.userId, identity.userId))
      .returning({ id: schema.session.id });

    return {
      userId: identity.userId,
      revokedSessions: sessions.length,
    };
  });
}
