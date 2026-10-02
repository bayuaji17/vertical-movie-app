import { eq, sql } from "drizzle-orm";
import type { BunSQLDatabase } from "drizzle-orm/bun-sql";

import { hashPassword } from "@repo/auth/server";
import * as schema from "../../db/schema";

type ProvisionDatabase = BunSQLDatabase<typeof schema>;

export type ProvisionAdminResult = {
  status: "created" | "already-provisioned";
  userId: string;
};

export class AdminProvisionConflictError extends Error {
  constructor() {
    super("The configured administrator identity conflicts with this request.");
    this.name = "AdminProvisionConflictError";
  }
}

export function normalizeAdminEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new Error("A valid administrator email is required.");
  }
  return email;
}

export function validateAdminPassword(value: string): void {
  if (value.length < 12 || value.length > 128) {
    throw new Error("The administrator password must be 12 to 128 characters.");
  }
}

export async function provisionAdmin(
  database: ProvisionDatabase,
  input: { email: string; password: string },
): Promise<ProvisionAdminResult> {
  const email = normalizeAdminEmail(input.email);
  validateAdminPassword(input.password);

  // Use the public Better Auth hasher before opening the transaction.
  const passwordHash = await hashPassword(input.password);
  const userId = crypto.randomUUID();
  const now = new Date();

  return database.transaction(async (transaction) => {
    // Serialize first-time provisioning even when two operator processes race.
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(1481985763, 1)`);

    const [existingAdmin] = await transaction
      .select({ userId: schema.adminIdentity.userId, email: schema.user.email })
      .from(schema.adminIdentity)
      .innerJoin(schema.user, eq(schema.user.id, schema.adminIdentity.userId))
      .limit(1);

    if (existingAdmin) {
      if (existingAdmin.email !== email) {
        throw new AdminProvisionConflictError();
      }
      return { status: "already-provisioned", userId: existingAdmin.userId };
    }

    const [existingUser] = await transaction
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);
    if (existingUser) throw new AdminProvisionConflictError();

    await transaction.insert(schema.user).values({
      id: userId,
      name: email,
      email,
      emailVerified: false,
      role: "admin", // Compatibility writer, removed after native CLI cutover.
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(schema.account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(schema.adminIdentity).values({
      id: "primary",
      userId,
    });

    return { status: "created", userId };
  });
}
