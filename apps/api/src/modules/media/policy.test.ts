import { describe, test, expect } from "bun:test";
import { geometry, validateUpload, partTtl, verifyParts } from "./policy";
describe("multipart policy", () => {
  test("geometry respects actual bytes, provider minimum and small images", () => {
    expect(geometry(512000000n)).toEqual({
      partSizeBytes: 10240000n,
      partCount: 50,
    });
    expect(geometry(1500000000n)).toEqual({
      partSizeBytes: 30000000n,
      partCount: 50,
    });
    expect(geometry(100000000n)).toEqual({
      partSizeBytes: 5242880n,
      partCount: 20,
    });
    expect(geometry(5000000n)).toEqual({
      partSizeBytes: 5242880n,
      partCount: 1,
    });
    expect(geometry(500000001n)).toEqual({
      partSizeBytes: 10000001n,
      partCount: 50,
    });
  });
  test("limits depend on owner kind even for short source files", () => {
    expect(() =>
      validateUpload("source", "episode", "a.mp4", "video/mp4", 512000000n),
    ).not.toThrow();
    expect(() =>
      validateUpload("source", "episode", "a.mp4", "video/mp4", 512000001n),
    ).toThrow();
    expect(() =>
      validateUpload("source", "movie", "a.mp4", "video/mp4", 1500000000n),
    ).not.toThrow();
    expect(() =>
      validateUpload("poster", undefined, "a.png", "image/png", 5000001n),
    ).toThrow();
    expect(() =>
      validateUpload("poster", undefined, "a.jpg", "video/mp4", 100n),
    ).toThrow();
  });
  test("signing cannot extend session or use subsecond remaining time", () => {
    const now = new Date(0);
    expect(partTtl(new Date(2000000), now, 900)).toBe(900);
    expect(partTtl(new Date(1500), now, 900)).toBe(1);
    expect(() => partTtl(new Date(999), now, 900)).toThrow();
  });
  test("completion reconciles provider parts rather than client etag or byte claims", () => {
    const parts = [
      { partNumber: 2, etag: "second", sizeBytes: 5 },
      { partNumber: 1, etag: "first", sizeBytes: 5242880 },
    ];
    expect(verifyParts(parts, 5242885n, 5242880n, 2)[0].etag).toBe("first");
    expect(() => verifyParts(parts, 5242886n, 5242880n, 2)).toThrow();
    expect(() => verifyParts([parts[0]], 5242885n, 5242880n, 2)).toThrow();
    expect(() =>
      verifyParts([parts[1], parts[1]], 10485760n, 5242880n, 2),
    ).toThrow();
  });
});
