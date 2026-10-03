import { describe, expect, it } from "bun:test";
import { isAdminSession, projectSession } from "./client";

describe("native session projection", () => {
  it("keeps only safe fields and respects role, ban and expiry", () => {
    const native = {
      user: {
        id: "a",
        name: "Admin",
        email: "fixture@example.test",
        role: "admin",
        banned: false,
        secret: "excluded",
      },
      session: {
        expiresAt: new Date("2030-01-01Z"),
        token: "excluded",
        ipAddress: "excluded",
      },
    };
    const snapshot = projectSession(native);
    expect(JSON.stringify(snapshot)).not.toContain("excluded");
    expect(isAdminSession(snapshot, Date.parse("2029-01-01Z"))).toBe(true);
    expect(isAdminSession(snapshot, Date.parse("2031-01-01Z"))).toBe(false);
    expect(
      isAdminSession(
        projectSession({ ...native, user: { ...native.user, role: "user" } }),
      ),
    ).toBe(false);
    expect(
      isAdminSession(
        projectSession({ ...native, user: { ...native.user, banned: true } }),
      ),
    ).toBe(false);
    expect(projectSession(null)).toBeNull();
  });
});
