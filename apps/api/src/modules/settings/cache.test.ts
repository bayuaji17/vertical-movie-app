import { expect, test } from "bun:test";
import { SettingsCache } from "./cache";
import { SettingsService } from "./service";
import { SETTINGS_DEFAULTS, SETTINGS_TTL_MS } from "./model";
const row = (rowVersion = 1) => ({
  ...SETTINGS_DEFAULTS,
  rowVersion,
  updatedAt: new Date(0).toISOString(),
});
function deferred<T>() {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
test("100 cold reads coalesce; warm zero reads; original deadline expiry and separate fresh flight", async () => {
  let now = 0,
    reads = 0;
  const cache = new SettingsCache(
    async () => {
      reads++;
      return row();
    },
    () => now,
  );
  const all = await Promise.all(Array.from({ length: 100 }, () => cache.get()));
  expect(reads).toBe(1);
  expect(all.every((x) => x.freshForMs === SETTINGS_TTL_MS)).toBe(true);
  now = SETTINGS_TTL_MS - 10_000;
  expect((await cache.get()).freshForMs).toBe(10_000);
  expect(reads).toBe(1);
  now = SETTINGS_TTL_MS;
  await Promise.all(Array.from({ length: 100 }, () => cache.get()));
  expect(reads).toBe(2);
  await Promise.all(Array.from({ length: 10 }, () => cache.get(true)));
  expect(reads).toBe(3);
});
test("shared read survives waiter abort; delayed old fill and older successful write never restore earlier version", async () => {
  const hold = deferred<unknown>(),
    cache = new SettingsCache(
      () => hold.promise,
      () => 0,
    ),
    controller = new AbortController();
  const aborted = cache.get(false, controller.signal),
    other = cache.get();
  controller.abort();
  await expect(aborted).rejects.toHaveProperty("name", "AbortError");
  cache.prime(row(3));
  cache.prime(row(2));
  hold.resolve(row(1));
  expect((await other).item.rowVersion).toBe(3);
  expect((await cache.get()).item.rowVersion).toBe(3);
});
test("fresh reads never join normal old fill; duration deducted; uncertainty fences old fill", async () => {
  let now = 0,
    reads = 0;
  const first = deferred<unknown>(),
    cache = new SettingsCache(
      () => (++reads === 1 ? first.promise : Promise.resolve(row(2))),
      () => now,
    );
  const old = cache.get();
  await Promise.resolve();
  now = 10;
  expect((await cache.get(true)).item.rowVersion).toBe(2);
  first.resolve(row());
  expect((await old).item.rowVersion).toBe(2);
  const held = deferred<unknown>(),
    other = new SettingsCache(
      () => held.promise,
      () => now,
    ),
    pending = other.get();
  other.expire();
  held.resolve(row());
  expect((await pending).freshForMs).toBe(0);
});
test("failures clean flights and cooldown prevents sequential outage storm; Save clears cooldown without refill", async () => {
  let now = 0,
    reads = 0;
  const cache = new SettingsCache(
    async () => {
      reads++;
      throw Error("private connection detail");
    },
    () => now,
  );
  for (let i = 0; i < 10; i++)
    await expect(cache.get()).rejects.toMatchObject({ httpStatus: 503 });
  expect(reads).toBe(1);
  now = 5000;
  await expect(cache.get()).rejects.toMatchObject({ httpStatus: 503 });
  expect(reads).toBe(2);
  cache.prime(row(2));
  await cache.get();
  expect(reads).toBe(2);
});
test("successful Save primes without SELECT; known conflict does not prime; uncertain commit expires", async () => {
  let reads = 0,
    fail = false;
  const service = new SettingsService(
    {
      read: async () => {
        reads++;
        return row();
      },
      save: async (fields, version) => {
        if (fail) throw Error("uncertain transport");
        return { ...fields, ...row(version + 1), siteName: fields.siteName };
      },
    },
    () => 0,
  );
  await service.read();
  await service.save({
    ...SETTINGS_DEFAULTS,
    siteName: "Saved",
    expectedVersion: 1,
  });
  expect((await service.read()).siteName).toBe("Saved");
  expect(reads).toBe(1);
  fail = true;
  await expect(
    service.save({ ...SETTINGS_DEFAULTS, expectedVersion: 2 }),
  ).rejects.toMatchObject({ httpStatus: 503 });
  await expect(service.read()).rejects.toMatchObject({ httpStatus: 503 });
  expect(reads).toBe(2);
});
test("slow fill deducts elapsed time and malformed/missing rows do not cache defaults", async () => {
  let now = 0,
    reads = 0;
  const cache = new SettingsCache(
    async () => {
      reads++;
      now += 10000;
      return row();
    },
    () => now,
  );
  expect((await cache.get()).freshForMs).toBe(3590000);
  expect(reads).toBe(1);
  for (const value of [
    null,
    { ...row(), description: 500 },
    { ...row(), rowVersion: -1 },
  ])
    await expect(
      new SettingsCache(async () => value).get(),
    ).rejects.toMatchObject({ httpStatus: 503 });
});
