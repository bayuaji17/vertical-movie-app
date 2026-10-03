ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
-- Refuse inconsistent legacy identities instead of choosing or recreating an admin.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "admin_identity" ai
    WHERE ai.id <> 'primary' OR NOT EXISTS (
      SELECT 1 FROM "account" a
      WHERE a.user_id = ai.user_id AND a.provider_id = 'credential'
        AND a.password IS NOT NULL AND a.password <> ''
    )
  ) THEN RAISE EXCEPTION 'Legacy admin credentials must be repaired before auth expansion';
  END IF;
END $$;--> statement-breakpoint
UPDATE "user" SET "role" = 'admin'
WHERE "id" IN (SELECT "user_id" FROM "admin_identity");--> statement-breakpoint
CREATE UNIQUE INDEX "user_single_admin_idx" ON "user" USING btree ("role") WHERE "user"."role" = 'admin';--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_canonical_role_check" CHECK ("user"."role" IN ('user', 'admin'));
