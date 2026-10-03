CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"season_id" uuid,
	"episode_number" integer,
	"slug" varchar(180) NOT NULL,
	"title" varchar(200) NOT NULL,
	"original_title" varchar(200),
	"synopsis" varchar(500),
	"description" text,
	"original_language" varchar(35),
	"release_year" smallint,
	"release_date" date,
	"rights_confirmed_at" timestamp with time zone,
	"rights_confirmed_by" text,
	"publication_status" text DEFAULT 'draft' NOT NULL,
	"first_published_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "videos_slug_unique" UNIQUE("slug"),
	CONSTRAINT "videos_episode_number_unique" UNIQUE("season_id","episode_number"),
	CONSTRAINT "videos_title_check" CHECK ("videos"."title" IS NULL OR length(btrim("videos"."title")) > 0),
	CONSTRAINT "videos_description_check" CHECK ("videos"."description" IS NULL OR length("videos"."description") <= 10000),
	CONSTRAINT "videos_year_check" CHECK ("videos"."release_year" IS NULL OR "videos"."release_year" BETWEEN 1800 AND 9999),
	CONSTRAINT "videos_date_check" CHECK ("videos"."release_date" IS NULL OR "videos"."release_year" IS NULL OR EXTRACT(YEAR FROM "videos"."release_date") = "videos"."release_year"),
	CONSTRAINT "videos_version_check" CHECK ("videos"."row_version" > 0),
	CONSTRAINT "videos_status_check" CHECK ("videos"."publication_status" IN ('draft','published','unpublished')),
	CONSTRAINT "videos_publication_check" CHECK (("videos"."publication_status" = 'published' AND "videos"."published_at" IS NOT NULL AND "videos"."first_published_at" IS NOT NULL AND "videos"."archived_at" IS NULL) OR ("videos"."publication_status" IN ('draft','unpublished') AND "videos"."published_at" IS NULL)),
	CONSTRAINT "videos_kind_check" CHECK ("videos"."kind" IN ('standalone','movie','episode')),
	CONSTRAINT "videos_episode_check" CHECK (("videos"."kind" = 'episode' AND "videos"."season_id" IS NOT NULL AND "videos"."episode_number" IS NOT NULL AND "videos"."episode_number" > 0) OR ("videos"."kind" IN ('standalone','movie') AND "videos"."season_id" IS NULL AND "videos"."episode_number" IS NULL)),
	CONSTRAINT "videos_slug_check" CHECK ("videos"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "videos_rights_check" CHECK (("videos"."rights_confirmed_at" IS NULL) = ("videos"."rights_confirmed_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_rights_confirmed_by_user_id_fk" FOREIGN KEY ("rights_confirmed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "videos_admin_list_idx" ON "videos" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "videos"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "videos_kind_list_idx" ON "videos" USING btree ("kind","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "videos"."archived_at" IS NULL;