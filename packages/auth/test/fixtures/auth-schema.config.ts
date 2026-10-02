import { createAdminAuthServer } from "../../src/server";

// CLI generation only: the adapter inspects schema/config without opening a pool.
export const auth = createAdminAuthServer({
  database: {} as Parameters<typeof createAdminAuthServer>[0]["database"],
  origin: "http://localhost:3000",
  secret: "schema-fixture-only-secret-with-no-live-credentials",
  secureCookies: false,
});
