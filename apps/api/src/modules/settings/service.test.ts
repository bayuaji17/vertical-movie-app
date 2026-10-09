import { expect, test } from "bun:test";
import { SettingsService } from "./service";
import { SETTINGS_DEFAULTS, saveInput } from "./model";
const row = () => ({
  ...SETTINGS_DEFAULTS,
  rowVersion: 1,
  updatedAt: new Date().toISOString(),
});
test("full fields trim, optional blanks, Unicode codepoints and unsafe input", () => {
  expect(
    saveInput({ ...SETTINGS_DEFAULTS, siteName: " 😀 ", expectedVersion: 1 })
      .fields.siteName,
  ).toBe("😀");
  expect(
    saveInput({
      ...SETTINGS_DEFAULTS,
      siteName: "😀".repeat(80),
      tagline: "",
      expectedVersion: 1,
    }).fields.tagline,
  ).toBe("");
  for (const bad of [
    { siteName: "😀".repeat(81) },
    { siteName: " " },
    { tagline: "bad\ntext" },
    { footerText: "a\u0000b" },
    { extra: "secret" },
    { expectedVersion: 0 },
  ])
    expect(() =>
      saveInput({ ...SETTINGS_DEFAULTS, expectedVersion: 1, ...bad }),
    ).toThrow();
  expect(() => saveInput({ siteName: "Name", expectedVersion: 1 })).toThrow();
});
test("two same-version writes yield one success and preserve committed projection", async () => {
  let stored = row(),
    writes = 0;
  const service = new SettingsService({
    read: async () => stored,
    save: async (fields, version) => {
      writes++;
      if (version !== stored.rowVersion) return null;
      stored = {
        ...fields,
        rowVersion: version + 1,
        updatedAt: stored.updatedAt,
      };
      return { ...stored, secret: "must not leak" };
    },
  });
  const result = await Promise.allSettled([
    service.save({
      ...SETTINGS_DEFAULTS,
      siteName: " New ",
      expectedVersion: 1,
    }),
    service.save({
      ...SETTINGS_DEFAULTS,
      siteName: "Other",
      expectedVersion: 1,
    }),
  ]);
  expect(result.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(result.filter((x) => x.status === "rejected")).toHaveLength(1);
  expect(writes).toBe(2);
  expect(await service.read()).toEqual({ ...stored, siteName: "New" });
});
test("missing, malformed, and dependency failures remain503; known conflict409", async () => {
  for (const value of [
    null,
    { ...row(), rowVersion: 0 },
    { ...row(), siteName: 42 },
    { ...row(), updatedAt: "bad" },
  ])
    await expect(
      new SettingsService({
        read: async () => value,
        save: async () => value,
      }).read(),
    ).rejects.toMatchObject({ httpStatus: 503 });
  await expect(
    new SettingsService().save({ ...SETTINGS_DEFAULTS, expectedVersion: 1 }),
  ).rejects.toMatchObject({ httpStatus: 503 });
  await expect(
    new SettingsService({
      read: async () => null,
      save: async () => null,
    }).save({ ...SETTINGS_DEFAULTS, expectedVersion: 1 }),
  ).rejects.toMatchObject({ httpStatus: 503 });
  await expect(
    new SettingsService({
      read: async () => row(),
      save: async () => null,
    }).save({ ...SETTINGS_DEFAULTS, expectedVersion: 1 }),
  ).rejects.toMatchObject({ httpStatus: 409 });
});
