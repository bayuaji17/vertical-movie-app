CREATE TABLE "content_operations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"video_id" uuid,
	"series_id" uuid,
	"actor_id" text NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"action" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_operations_idempotency_unique" UNIQUE("actor_id","idempotency_key"),
	CONSTRAINT "content_operations_owner_check" CHECK (num_nonnulls("content_operations"."video_id","content_operations"."series_id")=1),
	CONSTRAINT "content_operations_action_check" CHECK ("content_operations"."action" IN ('publish','archive')),
	CONSTRAINT "content_operations_hash_check" CHECK ("content_operations"."request_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "videos" DROP CONSTRAINT "videos_status_check";--> statement-breakpoint
ALTER TABLE "videos" DROP CONSTRAINT "videos_publication_check";--> statement-breakpoint
ALTER TABLE "content_operations" ADD CONSTRAINT "content_operations_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_operations" ADD CONSTRAINT "content_operations_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_operations" ADD CONSTRAINT "content_operations_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Preserve legacy archived drafts; unpublished rows become active drafts.
UPDATE "videos" SET "publication_status"=CASE WHEN "archived_at" IS NOT NULL THEN 'archived' WHEN "publication_status"='unpublished' THEN 'draft' ELSE "publication_status" END, "published_at"=CASE WHEN "archived_at" IS NOT NULL OR "publication_status"='unpublished' THEN NULL ELSE "published_at" END;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_status_check" CHECK ("videos"."publication_status" IN ('draft','published','archived'));--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_publication_check" CHECK (("videos"."publication_status"='published' AND "videos"."published_at" IS NOT NULL AND "videos"."first_published_at" IS NOT NULL AND "videos"."archived_at" IS NULL) OR ("videos"."publication_status"='draft' AND "videos"."published_at" IS NULL AND "videos"."archived_at" IS NULL) OR ("videos"."publication_status"='archived' AND "videos"."published_at" IS NULL AND "videos"."archived_at" IS NOT NULL));