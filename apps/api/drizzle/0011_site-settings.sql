CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"site_name" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"footer_text" text NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 1),
	CONSTRAINT "site_settings_name" CHECK (char_length(btrim("site_settings"."site_name")) BETWEEN 1 AND 80),
	CONSTRAINT "site_settings_tagline" CHECK (char_length("site_settings"."tagline") <= 160),
	CONSTRAINT "site_settings_description" CHECK (char_length("site_settings"."description") <= 500),
	CONSTRAINT "site_settings_footer" CHECK (char_length("site_settings"."footer_text") <= 300),
	CONSTRAINT "site_settings_version" CHECK ("site_settings"."row_version" > 0)
);
--> statement-breakpoint
INSERT INTO "site_settings" ("id", "site_name", "tagline", "description", "footer_text") VALUES (1, 'Vertical Movie', 'Find your next story.', 'Discover films and standalone stories in portrait. Open to everyone.', 'Stories made for portrait.') ON CONFLICT ("id") DO NOTHING;
