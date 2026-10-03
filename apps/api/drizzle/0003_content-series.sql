CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"series_id" uuid NOT NULL,
	"season_number" integer NOT NULL,
	"title" varchar(200),
	"description" text,
	"release_year" smallint,
	"release_date" date,
	"archived_at" timestamp with time zone,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_number_unique" UNIQUE("series_id","season_number"),
	CONSTRAINT "seasons_title_check" CHECK ("seasons"."title" IS NULL OR length(btrim("seasons"."title")) > 0),
	CONSTRAINT "seasons_description_check" CHECK ("seasons"."description" IS NULL OR length("seasons"."description") <= 10000),
	CONSTRAINT "seasons_year_check" CHECK ("seasons"."release_year" IS NULL OR "seasons"."release_year" BETWEEN 1800 AND 9999),
	CONSTRAINT "seasons_date_check" CHECK ("seasons"."release_date" IS NULL OR "seasons"."release_year" IS NULL OR EXTRACT(YEAR FROM "seasons"."release_date") = "seasons"."release_year"),
	CONSTRAINT "seasons_version_check" CHECK ("seasons"."row_version" > 0),
	CONSTRAINT "seasons_number_check" CHECK ("seasons"."season_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(180) NOT NULL,
	"title" varchar(200) NOT NULL,
	"original_title" varchar(200),
	"synopsis" varchar(500),
	"description" text,
	"original_language" varchar(35),
	"release_year" smallint,
	"release_date" date,
	"completion_status" text DEFAULT 'ongoing' NOT NULL,
	"publication_status" text DEFAULT 'draft' NOT NULL,
	"first_published_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug"),
	CONSTRAINT "series_title_check" CHECK ("series"."title" IS NULL OR length(btrim("series"."title")) > 0),
	CONSTRAINT "series_description_check" CHECK ("series"."description" IS NULL OR length("series"."description") <= 10000),
	CONSTRAINT "series_year_check" CHECK ("series"."release_year" IS NULL OR "series"."release_year" BETWEEN 1800 AND 9999),
	CONSTRAINT "series_date_check" CHECK ("series"."release_date" IS NULL OR "series"."release_year" IS NULL OR EXTRACT(YEAR FROM "series"."release_date") = "series"."release_year"),
	CONSTRAINT "series_version_check" CHECK ("series"."row_version" > 0),
	CONSTRAINT "series_status_check" CHECK ("series"."publication_status" IN ('draft','published','unpublished')),
	CONSTRAINT "series_publication_check" CHECK (("series"."publication_status" = 'published' AND "series"."published_at" IS NOT NULL AND "series"."first_published_at" IS NOT NULL AND "series"."archived_at" IS NULL) OR ("series"."publication_status" IN ('draft','unpublished') AND "series"."published_at" IS NULL)),
	CONSTRAINT "series_slug_check" CHECK ("series"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "series_completion_check" CHECK ("series"."completion_status" IN ('ongoing','completed'))
);
--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "series_admin_list_idx" ON "series" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "series"."archived_at" IS NULL;