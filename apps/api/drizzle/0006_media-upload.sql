CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"video_id" uuid,
	"series_id" uuid,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"state" text DEFAULT 'uploading' NOT NULL,
	"size_bytes" bigint NOT NULL,
	"content_type" text NOT NULL,
	"etag" text,
	"sha256" text,
	"facts" jsonb,
	"generation" integer DEFAULT 1 NOT NULL,
	"verified_ready_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"deletion_token" uuid,
	"deletion_claimed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_video_owner_unique" UNIQUE("id","video_id"),
	CONSTRAINT "media_assets_series_owner_unique" UNIQUE("id","series_id"),
	CONSTRAINT "media_assets_kind_unique" UNIQUE("id","kind"),
	CONSTRAINT "media_assets_object_unique" UNIQUE("provider","bucket","object_key"),
	CONSTRAINT "media_assets_owner_check" CHECK (num_nonnulls("media_assets"."video_id","media_assets"."series_id") = 1 AND ("media_assets"."series_id" IS NULL OR "media_assets"."kind" = 'poster')),
	CONSTRAINT "media_assets_kind_check" CHECK ("media_assets"."kind" IN ('source','poster')),
	CONSTRAINT "media_assets_provider_check" CHECK ("media_assets"."provider" IN ('minio','r2')),
	CONSTRAINT "media_assets_state_check" CHECK ("media_assets"."state" IN ('uploading','uploaded','processing','ready','failed')),
	CONSTRAINT "media_assets_size_check" CHECK ("media_assets"."size_bytes" > 0 AND "media_assets"."generation" > 0),
	CONSTRAINT "media_assets_sha256_check" CHECK ("media_assets"."sha256" IS NULL OR "media_assets"."sha256" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "media_assets_deletion_check" CHECK (("media_assets"."deletion_token" IS NULL) = ("media_assets"."deletion_claimed_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"video_id" uuid,
	"series_id" uuid,
	"kind" text NOT NULL,
	"actor_id" text NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"filename" text NOT NULL,
	"staging_key" text NOT NULL,
	"upload_id" text,
	"status" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"part_size_bytes" bigint NOT NULL,
	"part_count" integer NOT NULL,
	"claim_token" uuid,
	"claim_until" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"failure_code" text,
	"cleaned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_sessions_staging_key_unique" UNIQUE("staging_key"),
	CONSTRAINT "upload_sessions_idempotency_unique" UNIQUE("actor_id","idempotency_key"),
	CONSTRAINT "upload_sessions_owner_check" CHECK (num_nonnulls("upload_sessions"."video_id","upload_sessions"."series_id")=1),
	CONSTRAINT "upload_sessions_state_check" CHECK ("upload_sessions"."status" IN ('initializing','pending','completing','completed','aborting','aborted','expired','failed')),
	CONSTRAINT "upload_sessions_geometry_check" CHECK ("upload_sessions"."size_bytes">0 AND "upload_sessions"."part_size_bytes">=5242880 AND "upload_sessions"."part_count"=ceil("upload_sessions"."size_bytes"::numeric/"upload_sessions"."part_size_bytes") AND "upload_sessions"."part_count" BETWEEN 1 AND 10000),
	CONSTRAINT "upload_sessions_hash_check" CHECK ("upload_sessions"."request_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "upload_sessions_claim_check" CHECK (("upload_sessions"."claim_token" IS NULL)=("upload_sessions"."claim_until" IS NULL)),
	CONSTRAINT "upload_sessions_expiry_check" CHECK ("upload_sessions"."expires_at">"upload_sessions"."created_at"),
	CONSTRAINT "upload_sessions_completion_check" CHECK (("upload_sessions"."status"='completed')=("upload_sessions"."completed_at" IS NOT NULL) AND ("upload_sessions"."status" NOT IN ('pending','completing','completed') OR "upload_sessions"."upload_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "poster_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "poster_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "source_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_video_owner_fk" FOREIGN KEY ("asset_id","video_id") REFERENCES "public"."media_assets"("id","video_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_series_owner_fk" FOREIGN KEY ("asset_id","series_id") REFERENCES "public"."media_assets"("id","series_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_kind_fk" FOREIGN KEY ("asset_id","kind") REFERENCES "public"."media_assets"("id","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_assets_retention_idx" ON "media_assets" USING btree ("verified_ready_at") WHERE "media_assets"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "upload_sessions_pending_owner_unique" ON "upload_sessions" USING btree (coalesce("video_id","series_id"),(CASE WHEN "video_id" IS NULL THEN 'series' ELSE 'video' END),"kind") WHERE "upload_sessions"."status" IN ('initializing','pending','completing','aborting');--> statement-breakpoint
CREATE INDEX "upload_sessions_expiry_idx" ON "upload_sessions" USING btree ("expires_at") WHERE "upload_sessions"."cleaned_at" IS NULL;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_poster_owner_fk" FOREIGN KEY ("poster_asset_id","id") REFERENCES "public"."media_assets"("id","series_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_poster_owner_fk" FOREIGN KEY ("poster_asset_id","id") REFERENCES "public"."media_assets"("id","video_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_source_owner_fk" FOREIGN KEY ("source_asset_id","id") REFERENCES "public"."media_assets"("id","video_id") ON DELETE no action ON UPDATE no action;