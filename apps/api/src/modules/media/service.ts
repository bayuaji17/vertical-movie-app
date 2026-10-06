import { createHash } from "node:crypto";
import type { StorageEnv } from "../../config/storage-env";
import type { MultipartStorage, UploadedPart } from "../../storage/multipart";
import {
  ContentError,
  invalid,
  notFound,
  unavailable,
} from "../../shared/content-error";
import type {
  MediaRepository,
  MediaStore,
  UploadRow,
  AssetRow,
} from "./repository";
import {
  playbackReadiness,
  posterReadiness,
} from "../../shared/media-readiness";
import type { InitiateUploadInput } from "./model";
import type { PosterProcessingService } from "./poster-processing";
import {
  geometry,
  partTtl,
  validateUpload,
  verifyParts,
  type Owner,
  type UploadKind,
  UPLOAD_FORMATS,
  uploadLimit,
} from "./policy";
function conflict(): never {
  throw new ContentError(
    "UPLOAD_STATE_CONFLICT",
    "Upload is busy or its state has changed.",
  );
}
const ownerOf = (s: UploadRow): Owner => ({
  ownerType: s.videoId ? "video" : "series",
  ownerId: (s.videoId ?? s.seriesId)!,
});
function editable(owner: { archived: boolean; status: string }) {
  if (owner.archived || owner.status !== "draft")
    throw new ContentError(
      "CONTENT_STATE_CONFLICT",
      "Upload requires active draft content.",
    );
}
const missing = (e: unknown) =>
  ["NoSuchUpload", "NotFound", "NoSuchKey"].includes(
    (e as { name?: string })?.name ?? "",
  );
function processingSummary(
  asset: AssetRow,
  job: Awaited<ReturnType<MediaStore["assetJob"]>> | undefined,
) {
  return {
    state: asset.state,
    jobState: job?.state ?? null,
    progressSeconds: job?.progressSeconds ?? 0,
    attempts: job?.attempts ?? 0,
    failureCode: job?.failureCode ?? null,
    verifiedReadyAt: asset.verifiedReadyAt?.toISOString() ?? null,
  };
}
export class MediaService {
  constructor(
    private readonly repository?: MediaRepository,
    private readonly storage?: MultipartStorage,
    private readonly config?: StorageEnv,
    private readonly runtime = {
      now: () => new Date(),
      id: () => crypto.randomUUID(),
    },
    private readonly posterProcessing?: PosterProcessingService,
  ) {}
  private deps() {
    if (!this.repository || !this.storage || !this.config) unavailable();
    return {
      repo: this.repository,
      storage: this.storage,
      config: this.config,
    };
  }
  private async read(id: string, actor: string) {
    const { repo, config } = this.deps();
    const s = await repo.store.session(id);
    if (!s || s.actorId !== actor) notFound();
    const a = await repo.store.asset(s.assetId);
    if (!a) notFound();
    if (a.provider !== config.provider || a.bucket !== config.bucket)
      throw new ContentError(
        "STORAGE_PROFILE_CONFLICT",
        "Stored asset belongs to another storage profile.",
      );
    return { s, a };
  }
  async ownerMedia(input: Owner, actor: string) {
    const { repo, config } = this.deps();
    return repo.snapshot(async (store) => {
      const owner = await store.owner(input);
      const canUpload = !owner.archived && owner.status === "draft";
      const checkProfile = (asset: { provider: string; bucket: string }) => {
        if (
          asset.provider !== config.provider ||
          asset.bucket !== config.bucket
        )
          throw new ContentError(
            "STORAGE_PROFILE_CONFLICT",
            "Stored asset belongs to another storage profile.",
          );
      };
      const descriptor = async (session: UploadRow | undefined) => {
        if (!session || session.actorId !== actor) return null;
        const asset = await store.asset(session.assetId);
        if (!asset) notFound();
        checkProfile(asset);
        const job = await store.assetJob(asset.id, asset.generation);
        const now = this.runtime.now();
        const canProcessPoster = Boolean(
          session.kind === "poster" &&
          session.processingMode === "request" &&
          session.status === "completed" &&
          canUpload &&
          owner.posterAssetId === asset.id &&
          job?.executionMode === "request" &&
          job.failures < 3 &&
          ((["queued", "retry"].includes(job.state) && job.runAfter <= now) ||
            (job.state === "running" &&
              job.leaseUntil !== null &&
              job.leaseUntil <= now)),
        );
        return {
          id: session.id,
          assetId: asset.id,
          status: session.status,
          filename: session.filename,
          contentType: asset.contentType,
          sizeBytes: session.sizeBytes.toString(),
          partSizeBytes: session.partSizeBytes.toString(),
          partCount: session.partCount,
          expiresAt: session.expiresAt.toISOString(),
          completedAt: session.completedAt?.toISOString() ?? null,
          failureCode: session.failureCode,
          expectedSha256: session.expectedSha256,
          processingMode: session.processingMode,
          canProcessPoster,
          canResume:
            canUpload &&
            session.status === "pending" &&
            session.expectedSha256 !== null &&
            session.expiresAt > this.runtime.now(),
        };
      };
      const role = async (kind: UploadKind, assetId: string | null) => {
        const asset = assetId ? await store.asset(assetId) : undefined;
        if (assetId && !asset) notFound();
        if (asset) {
          checkProfile(asset);
          if (
            asset.kind !== kind ||
            (input.ownerType === "video" ? asset.videoId : asset.seriesId) !==
              input.ownerId
          )
            notFound();
        }
        const job = asset
          ? await store.assetJob(asset.id, asset.generation)
          : undefined;
        const fact = (name: string) => {
          const n = Number(asset?.facts?.[name]);
          return Number.isSafeInteger(n) && n > 0 ? n : null;
        };
        const active = await store.active(input, kind);
        const activeDescriptor = await descriptor(active);
        const lastAttemptDescriptor = await descriptor(
          await store.lastAttempt(input, kind, actor),
        );
        return {
          current: asset
            ? {
                id: asset.id,
                state: asset.state,
                sizeBytes: asset.sizeBytes.toString(),
                contentType: asset.contentType,
                originalAvailable: !asset.deletedAt && !asset.deletionToken,
                verifiedReadyAt: asset.verifiedReadyAt?.toISOString() ?? null,
                width: fact("width"),
                height: fact("height"),
                durationMs: fact("durationMs"),
                processing: processingSummary(asset, job),
              }
            : null,
          active: activeDescriptor,
          lastAttempt: lastAttemptDescriptor,
          busy: !!active,
          canProcessPoster: Boolean(
            activeDescriptor?.canProcessPoster ||
            lastAttemptDescriptor?.canProcessPoster,
          ),
        };
      };
      const source =
        input.ownerType === "video"
          ? await role("source", owner.sourceAssetId)
          : null;
      const poster = await role("poster", owner.posterAssetId);
      let canPreview = false;
      if (input.ownerType === "video") {
        const row = await store.preview(input.ownerId);
        if (row) {
          try {
            playbackReadiness(row, config);
            posterReadiness(row);
            canPreview = true;
          } catch (error) {
            if (!(error instanceof ContentError)) throw error;
          }
        }
      }
      const rules = (kind: UploadKind) => ({
        maxBytes: uploadLimit(kind, owner.kind).toString(),
        formats: Object.entries(UPLOAD_FORMATS[kind]).map(
          ([extension, contentTypes]) => ({ extension, contentTypes }),
        ),
      });
      return {
        ...input,
        rowVersion: owner.rowVersion,
        status: owner.archived ? "archived" : owner.status,
        canUpload,
        canPreview,
        source,
        poster,
        config: {
          ...config.upload,
          source: rules("source"),
          poster: rules("poster"),
          maxDurationSeconds: owner.kind === "episode" ? 600 : 1800,
          minVideoWidth: 480,
          maxVideoWidth: 1080,
          minPosterWidth: 1080,
          minPosterHeight: 1920,
        },
      };
    });
  }
  private async dto(s: UploadRow, parts: UploadedPart[] = []) {
    const { config, repo } = this.deps();
    const asset = await repo.store.asset(s.assetId);
    if (!asset) notFound();
    const job = await repo.store.assetJob(asset.id, asset.generation);
    const owner = await repo.store.owner(ownerOf(s));
    const now = this.runtime.now();
    const canProcessPoster = Boolean(
      s.kind === "poster" &&
      s.processingMode === "request" &&
      s.status === "completed" &&
      !owner.archived &&
      owner.status === "draft" &&
      owner.posterAssetId === asset.id &&
      job?.executionMode === "request" &&
      job.failures < 3 &&
      ((["queued", "retry"].includes(job.state) && job.runAfter <= now) ||
        (job.state === "running" &&
          job.leaseUntil !== null &&
          job.leaseUntil <= now)),
    );
    return {
      id: s.id,
      assetId: s.assetId,
      processingMode: s.processingMode,
      canProcessPoster,
      status: s.status,
      sizeBytes: s.sizeBytes.toString(),
      partSizeBytes: s.partSizeBytes.toString(),
      partCount: s.partCount,
      partConcurrency: config.upload.partConcurrency,
      expiresAt: s.expiresAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
      uploadedBytes:
        s.status === "completed"
          ? s.sizeBytes.toString()
          : parts.reduce((n, p) => n + BigInt(p.sizeBytes), 0n).toString(),
      parts: parts.map((p) => ({ ...p, sizeBytes: p.sizeBytes.toString() })),
      failureCode: s.failureCode,
      processing: processingSummary(asset, job),
    };
  }
  private async lock(
    store: MediaStore,
    initial: UploadRow,
    actor: string,
    requireEditable = true,
  ) {
    const owner = await store.owner(ownerOf(initial), true);
    if (requireEditable) editable(owner);
    const s = await store.session(initial.id, true);
    if (!s || s.actorId !== actor) notFound();
    return s;
  }
  async initiate(input: InitiateUploadInput, actor: string) {
    const { repo, storage, config } = this.deps(),
      now = this.runtime.now(),
      size = BigInt(input.sizeBytes),
      g = geometry(size);
    if (input.ownerType === "series" && input.kind !== "poster")
      invalid("Series only accepts a poster.");
    if (
      input.expectedSha256 !== undefined &&
      !/^[a-f0-9]{64}$/.test(input.expectedSha256)
    )
      invalid("File fingerprint is invalid.");
    const canonical = [
      input.ownerType,
      input.ownerId,
      input.kind,
      input.filename,
      input.contentType,
      size.toString(),
    ];
    // Legacy keys retain their exact original canonical payload without a null suffix.
    if (input.expectedSha256 !== undefined)
      canonical.push(input.expectedSha256);
    const hash = createHash("sha256")
      .update(JSON.stringify(canonical))
      .digest("hex");
    const token = this.runtime.id();
    const result = await repo.transact(async (store) => {
      const owner = await store.owner(input, true);
      editable(owner);
      validateUpload(
        input.kind,
        owner.kind,
        input.filename,
        input.contentType,
        size,
      );
      const replay = await store.replay(actor, input.idempotencyKey);
      if (replay) {
        if (replay.requestHash !== hash)
          throw new ContentError(
            "UPLOAD_IDEMPOTENCY_CONFLICT",
            "Idempotency key has another payload.",
          );
        if (replay.expiresAt <= now && replay.status !== "completed")
          throw new ContentError(
            "UPLOAD_EXPIRED",
            "Upload session has expired.",
          );
        if (replay.status !== "initializing")
          return { s: replay, initialize: false };
        if (replay.claimUntil && replay.claimUntil > now) conflict();
        if (replay.expiresAt <= now)
          throw new ContentError(
            "UPLOAD_EXPIRED",
            "Upload session has expired.",
          );
        return {
          s: await store.updateSession(replay.id, {
            claimToken: token,
            claimUntil: new Date(now.getTime() + 300000),
            updatedAt: now,
          }),
          initialize: true,
        };
      }
      if (input.kind === "poster" && input.expectedSha256 === undefined)
        invalid("A SHA-256 fingerprint is required for a new cover upload.");
      if (await store.active(input, input.kind))
        throw new ContentError(
          "UPLOAD_ALREADY_ACTIVE",
          "An upload already exists for this content and media kind.",
        );
      const id = this.runtime.id(),
        assetId = this.runtime.id(),
        ownership =
          input.ownerType === "video"
            ? { videoId: input.ownerId }
            : { seriesId: input.ownerId };
      await store.insertAsset({
        id: assetId,
        ...ownership,
        kind: input.kind,
        provider: config.provider,
        bucket: config.bucket,
        objectKey:
          "sources/" +
          assetId +
          "/" +
          (input.kind === "source" ? "original" : "poster-original"),
        sizeBytes: size,
        contentType: input.contentType,
        createdBy: actor,
        createdAt: now,
        updatedAt: now,
      });
      const s = await store.insertSession({
        id,
        assetId,
        ...ownership,
        kind: input.kind,
        processingMode: input.kind === "poster" ? "request" : "worker",
        actorId: actor,
        idempotencyKey: input.idempotencyKey,
        requestHash: hash,
        expectedSha256: input.expectedSha256 ?? null,
        filename: input.filename,
        stagingKey: "uploads/" + id + "/original",
        status: "initializing",
        sizeBytes: size,
        ...g,
        expiresAt: new Date(
          now.getTime() + config.upload.sessionTtlSeconds * 1000,
        ),
        claimToken: token,
        claimUntil: new Date(now.getTime() + 300000),
        createdAt: now,
        updatedAt: now,
      });
      return { s, initialize: true };
    });
    if (!result.initialize) return this.dto(result.s);
    const s = result.s;
    let uploadId: string | undefined;
    try {
      const existing = await storage.findUploads(s.stagingKey);
      uploadId =
        existing[0]?.uploadId ??
        (await storage.initiate(s.stagingKey, input.contentType));
      const ready = await repo.transact(async (store) => {
        const current = await this.lock(store, s, actor);
        if (
          current.status !== "initializing" ||
          current.claimToken !== token ||
          !current.claimUntil ||
          current.claimUntil <= this.runtime.now() ||
          current.expiresAt <= this.runtime.now()
        )
          conflict();
        return store.updateSession(s.id, {
          status: "pending",
          uploadId,
          claimToken: null,
          claimUntil: null,
          updatedAt: this.runtime.now(),
        });
      });
      return this.dto(ready);
    } catch (e) {
      // Persisted staging identity allows recovery if provider succeeded before a DB outage.
      await repo
        .transact(async (store) => {
          const current = await store.session(s.id, true);
          if (current?.claimToken === token)
            await store.updateSession(s.id, {
              claimToken: null,
              claimUntil: null,
              updatedAt: this.runtime.now(),
            });
        })
        .catch(() => {});
      if (e instanceof ContentError) throw e;
      throw new ContentError(
        "STORAGE_UNAVAILABLE",
        "Storage request failed; retry the same upload request.",
        503,
      );
    }
  }
  async status(id: string, actor: string) {
    const { s } = await this.read(id, actor);
    let parts: UploadedPart[] = [];
    if (s.status === "pending" && s.uploadId) {
      try {
        parts = await this.deps().storage.listParts(s.stagingKey, s.uploadId);
      } catch (e) {
        if (!missing(e))
          throw new ContentError(
            "STORAGE_UNAVAILABLE",
            "Upload status is temporarily unavailable.",
            503,
          );
      }
    }
    return this.dto(s, parts);
  }
  async part(id: string, number: number, actor: string) {
    const { s } = await this.read(id, actor),
      { repo, storage, config } = this.deps();
    editable(await repo.store.owner(ownerOf(s)));
    if (s.status !== "pending" || !s.uploadId) conflict();
    if (!Number.isInteger(number) || number < 1 || number > s.partCount)
      invalid("Part number is outside session geometry.");
    partTtl(s.expiresAt, this.runtime.now(), config.upload.partUrlTtlSeconds);
    const parts = await storage.listParts(s.stagingKey, s.uploadId);
    const uploaded = parts.find((p) => p.partNumber === number);
    const expected =
      number === s.partCount
        ? s.sizeBytes - s.partSizeBytes * BigInt(number - 1)
        : s.partSizeBytes;
    const done = !!uploaded && BigInt(uploaded.sizeBytes) === expected;
    const signedAt = this.runtime.now(),
      ttl = partTtl(s.expiresAt, signedAt, config.upload.partUrlTtlSeconds);
    const url = done
      ? null
      : await storage.signPart(s.stagingKey, s.uploadId, number, ttl);
    return {
      partNumber: number,
      url,
      alreadyUploaded: done,
      expiresAt: new Date(signedAt.getTime() + ttl * 1000).toISOString(),
    };
  }
  async complete(id: string, actor: string) {
    const { s, a } = await this.read(id, actor),
      { repo, storage } = this.deps();
    if (s.status === "completed") return this.dto(s);
    const token = this.runtime.id(),
      now = this.runtime.now();
    const claimed = await repo.transact(async (store) => {
      const r = await this.lock(store, s, actor);
      if (r.status === "completed") return r;
      if (r.expiresAt <= now)
        throw new ContentError("UPLOAD_EXPIRED", "Upload session has expired.");
      if (
        r.status !== "pending" &&
        (r.status !== "completing" || (!!r.claimUntil && r.claimUntil > now))
      )
        conflict();
      return store.updateSession(id, {
        status: "completing",
        claimToken: token,
        claimUntil: new Date(now.getTime() + 300000),
        updatedAt: now,
      });
    });
    if (claimed.status === "completed") return this.dto(claimed);
    let providerCompleted = false;
    try {
      let stat;
      try {
        const parts = verifyParts(
          await storage.listParts(s.stagingKey, claimed.uploadId!),
          s.sizeBytes,
          s.partSizeBytes,
          s.partCount,
        );
        await storage.complete(s.stagingKey, claimed.uploadId!, parts);
        providerCompleted = true;
        stat = await storage.stat(s.stagingKey);
      } catch (e) {
        if (!missing(e)) throw e;
        stat = await storage.stat(s.stagingKey);
        providerCompleted = true;
      }
      if (
        BigInt(stat.sizeBytes) !== s.sizeBytes ||
        stat.contentType !== a.contentType
      )
        invalid("Uploaded object size or media type is invalid.");
      await storage.freeze(s.stagingKey, a.objectKey, stat.etag);
      const final = await storage.stat(a.objectKey);
      if (
        BigInt(final.sizeBytes) !== s.sizeBytes ||
        final.contentType !== a.contentType
      )
        invalid("Frozen object verification failed.");
      const completed = await repo.transact(async (store) => {
        const r = await this.lock(store, s, actor);
        const end = this.runtime.now();
        if (
          r.status !== "completing" ||
          r.claimToken !== token ||
          !r.claimUntil ||
          r.claimUntil <= end ||
          r.expiresAt <= end
        )
          conflict();
        await store.updateAsset(a.id, {
          state: "uploaded",
          etag: final.etag,
          updatedAt: end,
        });
        await store.activate(ownerOf(s), s.kind, a.id, actor, end);
        await store.enqueue(a.id, a.generation, s.kind, end, s.processingMode);
        return store.updateSession(id, {
          status: "completed",
          completedAt: end,
          claimToken: null,
          claimUntil: null,
          updatedAt: end,
        });
      });
      return this.dto(completed);
    } catch (e) {
      await repo
        .transact(async (store) => {
          const r = await store.session(id, true);
          if (r?.claimToken !== token) return;
          const terminal =
            providerCompleted &&
            e instanceof ContentError &&
            e.httpStatus === 422;
          await store.updateSession(id, {
            status: terminal
              ? "failed"
              : providerCompleted
                ? "completing"
                : "pending",
            failureCode: terminal ? "UPLOAD_INVALID_OBJECT" : null,
            claimToken: null,
            claimUntil: null,
            updatedAt: this.runtime.now(),
          });
          if (terminal)
            await store.updateAsset(a.id, {
              state: "failed",
              failedAt: this.runtime.now(),
              updatedAt: this.runtime.now(),
            });
        })
        .catch(() => {});
      if (e instanceof ContentError) throw e;
      throw new ContentError(
        "STORAGE_UNAVAILABLE",
        "Completion failed; retry the same session.",
        503,
      );
    }
  }
  async processPoster(id: string, actor: string, signal?: AbortSignal) {
    if (!this.posterProcessing) unavailable();
    await this.posterProcessing.process(id, actor, signal);
    return this.status(id, actor);
  }
  async abort(id: string, actor: string, expired = false) {
    const { s } = await this.read(id, actor),
      { repo, storage } = this.deps();
    if (["aborted", "expired"].includes(s.status)) return this.dto(s);
    const token = this.runtime.id(),
      now = this.runtime.now();
    const claim = await repo.transact(async (store) => {
      const r = await this.lock(store, s, actor, false);
      if (["aborted", "expired"].includes(r.status)) return r;
      if (["completed", "failed"].includes(r.status)) conflict();
      if (
        ["completing", "initializing", "aborting"].includes(r.status) &&
        r.claimUntil &&
        r.claimUntil > now
      )
        conflict();
      return store.updateSession(id, {
        status: "aborting",
        claimToken: token,
        claimUntil: new Date(now.getTime() + 300000),
        updatedAt: now,
      });
    });
    if (claim.status !== "aborting") return this.dto(claim);
    try {
      const uploads = await storage.findUploads(s.stagingKey);
      for (const u of uploads) await storage.abort(s.stagingKey, u.uploadId);
      if (claim.uploadId) await storage.abort(s.stagingKey, claim.uploadId);
      const result = await repo.transact(async (store) => {
        const r = await store.session(id, true);
        if (r?.claimToken !== token || r.status !== "aborting") conflict();
        return store.updateSession(id, {
          status: expired ? "expired" : "aborted",
          claimToken: null,
          claimUntil: null,
          updatedAt: this.runtime.now(),
        });
      });
      return this.dto(result);
    } catch (e) {
      await repo
        .transact(async (store) => {
          const r = await store.session(id, true);
          if (r?.claimToken === token)
            await store.updateSession(id, {
              claimToken: null,
              claimUntil: null,
              updatedAt: this.runtime.now(),
            });
        })
        .catch(() => {});
      if (e instanceof ContentError) throw e;
      throw new ContentError(
        "STORAGE_UNAVAILABLE",
        "Abort failed; retry the session.",
        503,
      );
    }
  }
  async cleanup() {
    const { repo, storage } = this.deps(),
      now = this.runtime.now();
    let cleaned = 0;
    for (const s of await repo.store.cleanupCandidates(now)) {
      try {
        if (
          ["initializing", "pending", "completing", "aborting"].includes(
            s.status,
          )
        ) {
          await this.abort(s.id, s.actorId, true);
          continue;
        }
        const { a } = await this.read(s.id, s.actorId);
        const uploads = await storage.findUploads(s.stagingKey);
        for (const u of uploads) await storage.abort(s.stagingKey, u.uploadId);
        await storage.remove(s.stagingKey);
        if (
          ["aborted", "expired", "failed"].includes(s.status) &&
          ["uploading", "failed"].includes(a.state) &&
          !a.facts
        )
          await storage.remove(a.objectKey);
        await repo.transact(async (store) => {
          const r = await store.session(s.id, true);
          if (r && r.status === s.status)
            await store.updateSession(s.id, { cleanedAt: this.runtime.now() });
        });
        cleaned++;
      } catch {
        /* Safe retry next sweep; never emit provider URLs or credentials. */
      }
    }
    return { cleaned };
  }
}
