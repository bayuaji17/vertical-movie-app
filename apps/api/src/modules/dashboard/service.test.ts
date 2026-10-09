import { describe, expect, test } from "bun:test";
import { DashboardService } from "./service";
import type { DashboardSnapshot } from "./repository";
const empty = (): DashboardSnapshot => ({
  generatedAt: "2026-10-08T00:00:00Z",
  content: [],
  media: [],
  latestContent: [],
  failedMedia: [],
});
describe("dashboard summary", () => {
  test("empty database uses explicit zero partitions", async () => {
    const result = await new DashboardService({
      read: async () => empty(),
    }).summary();
    expect(result.content.film).toEqual({
      total: 0,
      draft: 0,
      published: 0,
      archived: 0,
      unpublished: 0,
    });
    expect(result.media).toEqual({
      queued: 0,
      running: 0,
      retry: 0,
      failed: 0,
    });
    expect(result.generatedAt).toBe("2026-10-08T00:00:00.000Z");
  });
  test("preserves own editorial partitions and legacy series unpublished", async () => {
    const snapshot = empty();
    snapshot.content = [
      { type: "series", status: "unpublished", count: "2" },
      { type: "series", status: "archived", count: 3n },
      { type: "episode", status: "published", count: 4 },
    ];
    const result = await new DashboardService({
      read: async () => snapshot,
    }).summary();
    expect(result.content.series).toEqual({
      total: 5,
      draft: 0,
      published: 0,
      archived: 3,
      unpublished: 2,
    });
    expect(result.content.episode.published).toBe(4);
  });
  test("counts safe integers without rounding", async () => {
    const snapshot = empty();
    snapshot.media = [{ state: "failed", count: "9007199254740991" }];
    expect(
      (await new DashboardService({ read: async () => snapshot }).summary())
        .media.failed,
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
  for (const count of ["9007199254740992", -1, 0.5, "1e3", "-2"]) {
    test(`rejects invalid count ${count}`, async () => {
      const snapshot = empty();
      snapshot.media = [{ state: "failed", count }];
      await expect(
        new DashboardService({ read: async () => snapshot }).summary(),
      ).rejects.toMatchObject({
        httpStatus: 503,
        code: "CONTENT_DEPENDENCY_UNAVAILABLE",
      });
    });
  }
  test("rejects aggregate total overflow", async () => {
    const snapshot = empty();
    snapshot.content = [
      { type: "film", status: "draft", count: Number.MAX_SAFE_INTEGER },
      { type: "film", status: "published", count: 1 },
    ];
    await expect(
      new DashboardService({ read: async () => snapshot }).summary(),
    ).rejects.toMatchObject({ httpStatus: 503 });
  });
  test("dependency failure and missing configuration are safe", async () => {
    for (const service of [
      new DashboardService(),
      new DashboardService({
        read: async () => {
          throw new Error("secret SQL connection");
        },
      }),
    ]) {
      await expect(service.summary()).rejects.toMatchObject({
        httpStatus: 503,
        message: "Content service is unavailable.",
      });
    }
  });
});

test("malformed repository count and DTO fail safely before HTTP serialization", async () => {
  const badCount = empty();
  badCount.media = [{ state: "failed", count: false as unknown as number }];
  const badDto = empty();
  badDto.latestContent = [
    {
      type: "film",
      id: "bad-id",
      title: "Invalid",
      publicationStatus: "draft",
      createdAt: new Date(),
    },
  ];
  for (const snapshot of [badCount, badDto])
    await expect(
      new DashboardService({ read: async () => snapshot }).summary(),
    ).rejects.toMatchObject({
      httpStatus: 503,
      code: "CONTENT_DEPENDENCY_UNAVAILABLE",
    });
});
