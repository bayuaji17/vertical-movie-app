import { describe, expect, it } from "bun:test";
import { loadPosterEnv } from "./poster-env";

describe("poster processing env", () => {
  it("uses bounded defaults for native cover processing", () => {
    expect(loadPosterEnv({})).toEqual({
      maxPixels: 16_777_216,
      concurrency: 1,
      timeoutSeconds: 20,
    });
  });

  it("accepts explicit bounded server settings", () => {
    expect(
      loadPosterEnv({
        MEDIA_POSTER_MAX_PIXELS: "4194304",
        MEDIA_POSTER_PROCESS_CONCURRENCY: "3",
        MEDIA_POSTER_PROCESS_TIMEOUT_SECONDS: "45",
      }),
    ).toEqual({ maxPixels: 4_194_304, concurrency: 3, timeoutSeconds: 45 });
  });

  it("rejects values that could remove output or resource bounds", () => {
    for (const source of [
      { MEDIA_POSTER_MAX_PIXELS: "2073599" },
      { MEDIA_POSTER_MAX_PIXELS: "16777217" },
      { MEDIA_POSTER_PROCESS_CONCURRENCY: "0" },
      { MEDIA_POSTER_PROCESS_CONCURRENCY: "5" },
      { MEDIA_POSTER_PROCESS_TIMEOUT_SECONDS: "121" },
      { MEDIA_POSTER_PROCESS_TIMEOUT_SECONDS: "1.5" },
      { MEDIA_POSTER_PROCESS_TIMEOUT_SECONDS: "1e2" },
    ]) {
      expect(() => loadPosterEnv(source)).toThrow();
    }
  });
});
