import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./test/fixtures/auth-probe-schema.ts",
  out: "./test/fixtures/auth-probe-migrations",
  dialect: "postgresql",
});
