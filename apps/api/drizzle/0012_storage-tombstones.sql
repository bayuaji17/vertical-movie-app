CREATE TABLE "media_storage_tombstones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"bucket" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "media_storage_tombstones_key_unique" UNIQUE("provider","bucket","kind","key"),
	CONSTRAINT "media_storage_tombstones_kind_check" CHECK ("media_storage_tombstones"."kind" IN ('object','prefix')),
	CONSTRAINT "media_storage_tombstones_key_check" CHECK (length("media_storage_tombstones"."key") BETWEEN 1 AND 1024 AND ("media_storage_tombstones"."kind" = 'object' OR "media_storage_tombstones"."key" LIKE '%/'))
);
--> statement-breakpoint
CREATE INDEX "media_storage_tombstones_pending_idx" ON "media_storage_tombstones" USING btree ("created_at") WHERE "media_storage_tombstones"."deleted_at" IS NULL;