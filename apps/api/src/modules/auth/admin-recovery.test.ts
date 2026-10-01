import { describe, expect, it } from "bun:test";

import { validateAdminPassword } from "./admin-provision";

describe("admin recovery password policy", () => {
  it("accepts password lengths supported by email/password auth", () => {
    expect(() => validateAdminPassword("a".repeat(12))).not.toThrow();
    expect(() => validateAdminPassword("a".repeat(128))).not.toThrow();
  });

  it("rejects passwords outside the auth policy", () => {
    expect(() => validateAdminPassword("a".repeat(11))).toThrow(
      "12 to 128 characters",
    );
    expect(() => validateAdminPassword("a".repeat(129))).toThrow(
      "12 to 128 characters",
    );
  });
});
