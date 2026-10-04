CREATE TABLE "media_job_attempts" (
	"token" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"output_prefix" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stopped_at" timestamp with time zone,
	"cleaned_at" timestamp with time zone,
	"failure_code" text,
	CONSTRAINT "media_job_attempts_output_prefix_unique" UNIQUE("output_prefix"),
	CONSTRAINT "media_job_attempts_number_unique" UNIQUE("job_id","attempt"),
	CONSTRAINT "media_job_attempts_attempt_check" CHECK ("media_job_attempts"."attempt">0)
);
--> statement-breakpoint
CREATE TABLE "media_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"generation" integer NOT NULL,
	"kind" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"progress_seconds" integer DEFAULT 0 NOT NULL,
	"failure_code" text,
	"output_prefix" text,
	"output_files" jsonb,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_jobs_generation_unique" UNIQUE("asset_id","generation"),
	CONSTRAINT "media_jobs_asset_unique" UNIQUE("id","asset_id"),
	CONSTRAINT "media_jobs_state_check" CHECK ("media_jobs"."state" IN ('queued','running','retry','succeeded','failed','cancelled')),
	CONSTRAINT "media_jobs_kind_check" CHECK ("media_jobs"."kind" IN ('source','poster')),
	CONSTRAINT "media_jobs_attempt_check" CHECK ("media_jobs"."attempts">=0 AND "media_jobs"."failures">=0 AND "media_jobs"."failures"<="media_jobs"."attempts" AND "media_jobs"."generation">0 AND "media_jobs"."progress_seconds">=0),
	CONSTRAINT "media_jobs_lease_check" CHECK (("media_jobs"."state"='running')=("media_jobs"."lease_token" IS NOT NULL AND "media_jobs"."lease_until" IS NOT NULL) AND ("media_jobs"."lease_token" IS NULL)=("media_jobs"."lease_until" IS NULL)),
	CONSTRAINT "media_jobs_ready_check" CHECK ("media_jobs"."state"<>'succeeded' OR ("media_jobs"."output_prefix" IS NOT NULL AND "media_jobs"."output_files" IS NOT NULL AND "media_jobs"."finished_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "media_renditions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"name" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bitrate" integer NOT NULL,
	"playlist_key" text NOT NULL,
	CONSTRAINT "media_renditions_job_name_unique" UNIQUE("job_id","name"),
	CONSTRAINT "media_renditions_dimensions_check" CHECK ("media_renditions"."width">0 AND "media_renditions"."height">"media_renditions"."width" AND "media_renditions"."width"<=1080 AND "media_renditions"."height"<=1920 AND "media_renditions"."bitrate">0)
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "ready_job_id" uuid;--> statement-breakpoint
ALTER TABLE "media_job_attempts" ADD CONSTRAINT "media_job_attempts_job_id_media_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."media_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_jobs" ADD CONSTRAINT "media_jobs_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_renditions" ADD CONSTRAINT "media_renditions_job_id_media_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."media_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_job_attempts_cleanup_idx" ON "media_job_attempts" USING btree ("stopped_at") WHERE "media_job_attempts"."cleaned_at" IS NULL;--> statement-breakpoint
CREATE INDEX "media_jobs_poll_idx" ON "media_jobs" USING btree ("run_after","id") WHERE "media_jobs"."state" IN ('queued','retry');--> statement-breakpoint
CREATE INDEX "media_jobs_lease_idx" ON "media_jobs" USING btree ("lease_until") WHERE "media_jobs"."state"='running';--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_ready_job_owner_fk" FOREIGN KEY ("ready_job_id","id") REFERENCES "public"."media_jobs"("id","asset_id") ON DELETE no action ON UPDATE no action;