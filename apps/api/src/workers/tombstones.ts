import type { SQL } from "bun";
import { createLogger, errorFields, type Logger } from "@repo/log";

import type { StorageEnv } from "../config/storage-env";
import type { MultipartStorage } from "../storage/multipart";

const uuid = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
// Only keys the application itself creates may ever be deleted from a tombstone.
const safeObject = new RegExp(
  `^(?:sources/${uuid}/(?:original|poster-original)|uploads/${uuid}/original)$`,
);
const safePrefix = new RegExp(`^outputs/${uuid}/$`);
export const maxTombstoneAttempts = 20;

/**
 * Remove storage objects left by deleted content. Tombstones are written in the
 * deletion transaction; this runs outside any transaction, is idempotent and
 * retries until the objects are gone.
 */
export function createTombstoneSweep({
  client,
  storage,
  profile,
  log = createLogger("worker"),
  batch = 50,
}: {
  client: SQL;
  storage: Pick<MultipartStorage, "remove" | "listKeys">;
  profile: Pick<StorageEnv, "provider" | "bucket">;
  log?: Logger;
  batch?: number;
}) {
  return async function sweep() {
    const rows =
      (await client`SELECT id,kind,key,attempts FROM media_storage_tombstones
      WHERE deleted_at IS NULL AND attempts<${maxTombstoneAttempts}
        AND provider=${profile.provider} AND bucket=${profile.bucket}
      ORDER BY created_at LIMIT ${batch}`) as Array<{
        id: string;
        kind: "object" | "prefix";
        key: string;
        attempts: number;
      }>;
    let removed = 0,
      objects = 0,
      failed = 0;
    for (const row of rows) {
      try {
        if (
          row.kind === "object"
            ? !safeObject.test(row.key)
            : !safePrefix.test(row.key)
        )
          throw new Error("Tombstone key is not an application storage key.");
        if (row.kind === "object") {
          await storage.remove(row.key);
          objects++;
        } else
          for (const key of await storage.listKeys(row.key)) {
            await storage.remove(key);
            objects++;
          }
        await client`UPDATE media_storage_tombstones SET deleted_at=now(),last_error=NULL WHERE id=${row.id}::uuid`;
        removed++;
      } catch (error) {
        failed++;
        const attempts = row.attempts + 1;
        await client`UPDATE media_storage_tombstones SET attempts=attempts+1,last_error=${String(
          (error as Error)?.message ?? error,
        ).slice(0, 300)} WHERE id=${row.id}::uuid`.catch(() => undefined);
        // An exhausted tombstone stays in the table for an operator to inspect.
        (attempts >= maxTombstoneAttempts ? log.error : log.warn)(
          "cleanup.tombstone_failed",
          {
            tombstoneId: row.id,
            kind: row.kind,
            attempts,
            ...errorFields(error),
          },
        );
      }
    }
    // Finished rows are only kept briefly as a trace of what was removed.
    await client`DELETE FROM media_storage_tombstones WHERE deleted_at IS NOT NULL AND deleted_at<now()-interval '7 days'`.catch(
      () => undefined,
    );
    if (rows.length > 0)
      log.info("cleanup.tombstones", {
        tombstones: removed,
        objects,
        failed,
        pending: Math.max(0, rows.length - removed - failed),
      });
    else log.debug("cleanup.tombstones", { tombstones: 0 });
    return { removed, objects, failed };
  };
}
