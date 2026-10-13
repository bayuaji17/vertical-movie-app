import type { resetMediaDatabase } from "./media-fixture";

export const actor = "media-admin";
export const sha = "a".repeat(64);
export type Client = Awaited<ReturnType<typeof resetMediaDatabase>>["client"];
// Assets, an upload session, a succeeded job with attempt/rendition, so every
// table in the deletion order has a row to remove.
export async function attachMedia(
  client: Client,
  owner: { videoId?: string; seriesId?: string },
  kind: "source" | "poster" = "source",
  jobState: "succeeded" | "running" | "queued" = "succeeded",
  sessionStatus: "completed" | "pending" = "completed",
  bucket = "test-bucket",
  by = actor,
) {
  const assetId = crypto.randomUUID(),
    jobId = crypto.randomUUID(),
    sessionId = crypto.randomUUID();
  const prefix = `outputs/${assetId}/${jobId}/${crypto.randomUUID()}/`;
  await client`INSERT INTO media_assets (id,video_id,series_id,kind,provider,bucket,object_key,state,size_bytes,content_type,sha256,created_by)
    VALUES (${assetId}::uuid,${owner.videoId ?? null}::uuid,${owner.seriesId ?? null}::uuid,${kind},'minio',${bucket},${"sources/" + assetId + "/original"},'ready',1000,'video/webm',${sha},${by})`;
  await client`INSERT INTO upload_sessions (id,asset_id,video_id,series_id,kind,actor_id,idempotency_key,request_hash,filename,staging_key,upload_id,status,size_bytes,part_size_bytes,part_count,expires_at,completed_at,created_at)
    VALUES (${sessionId}::uuid,${assetId}::uuid,${owner.videoId ?? null}::uuid,${owner.seriesId ?? null}::uuid,${kind},${by},${crypto.randomUUID()}::uuid,${sha},'a.webm',${"uploads/" + sessionId + "/original"},'upload-id',${sessionStatus},1000,5242880,1,now()+interval '1 day',${sessionStatus === "completed" ? new Date() : null},now())`;
  if (jobState === "succeeded")
    await client`INSERT INTO media_jobs (id,asset_id,generation,kind,state,attempts,output_prefix,output_files,finished_at)
      VALUES (${jobId}::uuid,${assetId}::uuid,1,${kind},'succeeded',1,${prefix},'["master.m3u8"]'::jsonb,now())`;
  else if (jobState === "running")
    await client`INSERT INTO media_jobs (id,asset_id,generation,kind,state,attempts,lease_token,lease_until)
      VALUES (${jobId}::uuid,${assetId}::uuid,1,${kind},'running',1,${crypto.randomUUID()}::uuid,now()+interval '2 minutes')`;
  else
    await client`INSERT INTO media_jobs (id,asset_id,generation,kind,state) VALUES (${jobId}::uuid,${assetId}::uuid,1,${kind},'queued')`;
  await client`INSERT INTO media_job_attempts (token,job_id,attempt,output_prefix) VALUES (${crypto.randomUUID()}::uuid,${jobId}::uuid,1,${prefix})`;
  if (jobState === "succeeded") {
    await client`INSERT INTO media_renditions (id,job_id,name,width,height,bitrate,playlist_key) VALUES (${crypto.randomUUID()}::uuid,${jobId}::uuid,'480',270,480,800000,${prefix + "0/index.m3u8"})`;
    await client`UPDATE media_assets SET ready_job_id=${jobId}::uuid,verified_ready_at=now() WHERE id=${assetId}::uuid`;
    if (owner.videoId && kind === "source")
      await client`UPDATE videos SET source_asset_id=${assetId}::uuid WHERE id=${owner.videoId}::uuid`;
    if (owner.videoId && kind === "poster")
      await client`UPDATE videos SET poster_asset_id=${assetId}::uuid WHERE id=${owner.videoId}::uuid`;
    if (owner.seriesId)
      await client`UPDATE series SET poster_asset_id=${assetId}::uuid WHERE id=${owner.seriesId}::uuid`;
  }
  return { assetId, jobId, sessionId };
}
export async function counts(client: Client) {
  const [row] = await client`SELECT
    (SELECT count(*)::int FROM videos) videos,
    (SELECT count(*)::int FROM seasons) seasons,
    (SELECT count(*)::int FROM series) series,
    (SELECT count(*)::int FROM media_assets) assets,
    (SELECT count(*)::int FROM upload_sessions) sessions,
    (SELECT count(*)::int FROM media_jobs) jobs,
    (SELECT count(*)::int FROM media_job_attempts) attempts,
    (SELECT count(*)::int FROM media_renditions) renditions,
    (SELECT count(*)::int FROM content_operations) operations,
    (SELECT count(*)::int FROM video_genres) video_genres,
    (SELECT count(*)::int FROM series_genres) series_genres`;
  return row as Record<string, number>;
}
export const empty = {
  videos: 0,
  seasons: 0,
  series: 0,
  assets: 0,
  sessions: 0,
  jobs: 0,
  attempts: 0,
  renditions: 0,
  operations: 0,
  video_genres: 0,
  series_genres: 0,
};
