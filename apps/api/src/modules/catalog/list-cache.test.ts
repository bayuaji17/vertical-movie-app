import { expect, test } from "bun:test";
import { CatalogService } from "./service";
import type { CatalogStore, PlayableRow } from "./repository";

const video = (title: string) =>
  ({
    video: {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "film",
      title,
      synopsis: "Story",
      kind: "movie",
      createdAt: new Date(0),
      episodeNumber: null,
    },
    source: { facts: { durationMs: 1000 } },
    season: null,
    parent: null,
  }) as unknown as PlayableRow;
test("a legacy list completing after invalidation cannot overwrite the new generation", async () => {
  let release!: (rows: PlayableRow[]) => void;
  let reads = 0;
  const pending = new Promise<PlayableRow[]>((resolve) => {
    release = resolve;
  });
  const service = new CatalogService({
    playable: async () => (++reads === 1 ? pending : [video("Current")]),
  } as CatalogStore);
  const old = service.list({ kinds: "movie,standalone" });
  service.invalidate();
  expect(
    (await service.list({ kinds: "standalone,movie" })).items[0]?.title,
  ).toBe("Current");
  release([video("Archived")]);
  expect((await old).items[0]?.title).toBe("Archived");
  expect(
    (await service.list({ kinds: "movie,standalone" })).items[0]?.title,
  ).toBe("Current");
  expect(reads).toBe(2);
});
test("list cache expiry starts at read initiation, isolates kinds and retries failed fills", async () => {
  let clock = 0,
    reads = 0,
    failed = true;
  const service = new CatalogService(
    {
      playable: async () => {
        reads++;
        if (failed) throw new Error("temporary database outage");
        clock += 10_000;
        return [video("Current")];
      },
    } as CatalogStore,
    () => clock,
  );
  await expect(service.list({ kinds: "movie" })).rejects.toThrow(
    "temporary database outage",
  );
  failed = false;
  await service.list({ kinds: "movie" });
  clock = 59_999;
  await service.list({ kinds: "movie" });
  expect(reads).toBe(2);
  clock = 60_000;
  await service.list({ kinds: "movie" });
  expect(reads).toBe(3);
  await service.list({ kinds: "standalone" });
  expect(reads).toBe(4);
  service.invalidate();
  await service.list({ kinds: "movie" });
  await service.list({ kinds: "standalone" });
  expect(reads).toBe(6);
});
