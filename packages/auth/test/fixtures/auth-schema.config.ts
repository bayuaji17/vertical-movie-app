import { betterAuth } from "better-auth";

export const auth = betterAuth({
  baseURL: "http://localhost:3000",
  secret: "schema-generator-fixture-secret-never-use-outside-tests",
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 5,
  },
});
