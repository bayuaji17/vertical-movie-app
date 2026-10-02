DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM admin_identity i
    LEFT JOIN "user" u ON u.id = i.user_id
    WHERE u.id IS NULL OR u.role <> 'admin'
      OR NOT EXISTS (
        SELECT 1 FROM account a WHERE a.user_id = u.id
          AND a.provider_id = 'credential' AND a.password IS NOT NULL
          AND length(a.password) > 0
      )
  ) THEN
    RAISE EXCEPTION 'Native admin cutover must be verified before contract migration';
  END IF;
END $$;
--> statement-breakpoint
DROP TABLE "admin_identity";
