import { describe, expect, it } from "bun:test";

import { normalizeAdminEmail, validateAdminPassword } from "./admin-provision";

describe("admin provisioning input policy", () => {
  it("normalizes the email used as the singleton identity", () => {
    expect(normalizeAdminEmail("  Admin@Example.Test ")).toBe(
      "admin@example.test",
    );
  });

  it("rejects malformed or overlong email addresses without echoing the value", () => {
    const invalidEmail = "secret-value-not-an-email";
    expect(() => normalizeAdminEmail(invalidEmail)).toThrow(
      "valid administrator email",
    );
    expect(() =>
      normalizeAdminEmail(`${"a".repeat(250)}@example.test`),
    ).toThrow("valid administrator email");
  });

  it("enforces the same password length accepted by the login policy", () => {
    expect(() => validateAdminPassword("too-short")).toThrow("12 to 128");
    expect(() => validateAdminPassword("x".repeat(129))).toThrow("12 to 128");
    expect(() => validateAdminPassword("long-enough-password")).not.toThrow();
  });
});
