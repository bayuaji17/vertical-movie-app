import { betterAuth } from "better-auth";

export const auth = betterAuth({
  baseURL: "http://localhost:3000",
  secret: "auth-adapter-test-secret-never-use-outside-the-fixture",
  emailAndPassword: {
    enabled: true,
  },
});
