import type { SQL } from "bun";
import type { WorkerEnv } from "../config/worker-env";
export type JobClaim = {
  id: string;
  assetId: string;
  generation: number;
  kind: "source" | "poster";
  attempts: number;
  failures: number;
  leaseToken: string;
  leaseUntil: Date;
  outputPrefix: string;
};
export function createMediaQueue(client: SQL, config: WorkerEnv) {
  return {
    async claim(): Promise<JobClaim | undefined> {
      return client.begin(async (tx) => {
        const token = crypto.randomUUID();
        const result =
          await tx`WITH candidate AS (SELECT j.id FROM media_jobs j JOIN media_assets a ON a.id=j.asset_id WHERE j.execution_mode='worker' AND j.state IN ('queued','retry') AND j.run_after<=now() AND j.failures<${config.maxAttempts} AND a.deleted_at IS NULL AND a.deletion_token IS NULL ORDER BY j.run_after,j.id FOR UPDATE OF j SKIP LOCKED LIMIT 1)
    UPDATE media_jobs j SET state='running',attempts=attempts+1,lease_token=${token}::uuid,lease_until=now()+${config.leaseSeconds}*interval '1 second',heartbeat_at=now(),started_at=now(),finished_at=NULL,progress_seconds=0,updated_at=now() FROM candidate c WHERE j.id=c.id RETURNING j.id,j.asset_id AS "assetId",j.generation,j.kind,j.attempts,j.failures,j.lease_token AS "leaseToken",j.lease_until AS "leaseUntil"`;
        const row = result[0] as Omit<JobClaim, "outputPrefix"> | undefined;
        if (!row) return;
        const prefix =
          "outputs/" + row.assetId + "/" + row.id + "/" + token + "/";
        await tx`INSERT INTO media_job_attempts(token,job_id,attempt,output_prefix) VALUES(${token}::uuid,${row.id}::uuid,${row.attempts},${prefix})`;
        await tx`UPDATE media_assets SET state='processing',updated_at=now() WHERE id=${row.assetId}::uuid AND generation=${row.generation}`;
        return { ...row, outputPrefix: prefix };
      });
    },
    async heartbeat(job: JobClaim, progress: number) {
      const rows =
        await client`UPDATE media_jobs SET lease_until=now()+${config.leaseSeconds}*interval '1 second',heartbeat_at=now(),progress_seconds=greatest(progress_seconds,${Math.max(0, Math.floor(progress))}),updated_at=now() WHERE id=${job.id}::uuid AND state='running' AND lease_token=${job.leaseToken}::uuid AND lease_until>now() RETURNING id`;
      return rows.length === 1;
    },
    async fail(job: JobClaim, code: string, terminal = false, pause = false) {
      return client.begin(async (tx) => {
        const dead =
          !pause && (terminal || job.failures + 1 >= config.maxAttempts);
        const delay = config.retryDelays[job.failures] ?? 300;
        const rows =
          await tx`UPDATE media_jobs SET state=${dead ? "failed" : "retry"},failures=failures+${pause ? 0 : 1},run_after=now()+${pause ? 300 : delay}*interval '1 second',lease_token=NULL,lease_until=NULL,failure_code=${code},finished_at=CASE WHEN ${dead} THEN now() ELSE NULL END,updated_at=now() WHERE id=${job.id}::uuid AND state='running' AND lease_token=${job.leaseToken}::uuid RETURNING id`;
        await tx`UPDATE media_job_attempts SET stopped_at=coalesce(stopped_at,now()),failure_code=${code} WHERE token=${job.leaseToken}::uuid`;
        if (rows.length && dead)
          await tx`UPDATE media_assets SET state='failed',failed_at=now(),updated_at=now() WHERE id=${job.assetId}::uuid AND generation=${job.generation}`;
        return rows.length === 1;
      });
    },
    async recover() {
      const expired =
        await client`SELECT id,asset_id AS "assetId",generation,kind,attempts,failures,lease_token AS "leaseToken",lease_until AS "leaseUntil" FROM media_jobs WHERE execution_mode='worker' AND state='running' AND lease_until<=now() ORDER BY lease_until LIMIT 100`;
      let recovered = 0;
      for (const raw of expired) {
        const job = raw as JobClaim;
        const dead = job.failures + 1 >= config.maxAttempts,
          delay = config.retryDelays[job.failures] ?? 300;
        const changed = await client.begin(async (tx) => {
          const rows =
            await tx`UPDATE media_jobs SET state=${dead ? "failed" : "retry"},failures=failures+1,run_after=now()+${delay}*interval '1 second',lease_token=NULL,lease_until=NULL,failure_code='MEDIA_LEASE_EXPIRED',finished_at=CASE WHEN ${dead} THEN now() ELSE NULL END,updated_at=now() WHERE id=${job.id}::uuid AND execution_mode='worker' AND state='running' AND lease_token=${job.leaseToken}::uuid AND lease_until<=now() RETURNING id`;
          if (rows.length) {
            await tx`UPDATE media_job_attempts SET stopped_at=coalesce(stopped_at,now()),failure_code='MEDIA_LEASE_EXPIRED' WHERE token=${job.leaseToken}::uuid`;
            if (dead)
              await tx`UPDATE media_assets SET state='failed',failed_at=now(),updated_at=now() WHERE id=${job.assetId}::uuid AND generation=${job.generation}`;
          }
          return rows.length;
        });
        recovered += changed;
      }
      return { recovered };
    },
    async stopped(job: JobClaim) {
      await client`UPDATE media_job_attempts SET stopped_at=coalesce(stopped_at,now()) WHERE token=${job.leaseToken}::uuid`;
    },
  };
}
export type MediaQueue = ReturnType<typeof createMediaQueue>;
