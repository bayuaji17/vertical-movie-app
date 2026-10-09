import { t } from "elysia";
import { ContentError, invalid } from "../../shared/content-error";
export const SETTINGS_TTL_MS = 3_600_000;
export const SETTINGS_LIMITS = {
  siteName: 80,
  tagline: 160,
  description: 500,
  footerText: 300,
} as const;
export type SettingsFields = Record<keyof typeof SETTINGS_LIMITS, string>;
export type SettingsRow = SettingsFields & {
  rowVersion: number;
  updatedAt: string;
};
export const SETTINGS_DEFAULTS: SettingsFields = Object.freeze({
  siteName: "Vertical Movie",
  tagline: "Find your next story.",
  description:
    "Discover films and standalone stories in portrait. Open to everyone.",
  footerText: "Stories made for portrait.",
});
export const settingsUnavailable = (): never => {
  throw new ContentError(
    "SETTINGS_UNAVAILABLE",
    "Site settings are temporarily unavailable.",
    503,
    5,
  );
};
const controls = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
export function normalizeFields(value: unknown): SettingsFields {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid("Settings fields are invalid.");
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).length !== 4 ||
    Object.keys(input).some(
      (k) => !Object.prototype.hasOwnProperty.call(SETTINGS_LIMITS, k),
    )
  )
    invalid("Supply exactly four settings fields.");
  const output = {} as SettingsFields;
  for (const key of Object.keys(SETTINGS_LIMITS) as (keyof SettingsFields)[]) {
    const v = input[key];
    if (typeof v !== "string" || controls.test(v))
      invalid("Settings must be single-line plain text.");
    const text = v.trim(),
      count = [...text].length;
    if (count > SETTINGS_LIMITS[key] || (key === "siteName" && !count))
      invalid("Settings text exceeds the allowed length.");
    output[key] = text;
  }
  return output;
}
export function saveInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid("Settings input is invalid.");
  const { expectedVersion, ...fields } = value as Record<string, unknown>;
  if (
    !Number.isInteger(expectedVersion) ||
    Number(expectedVersion) < 1 ||
    Number(expectedVersion) > 2147483646
  )
    invalid("Settings version is invalid.");
  return {
    fields: normalizeFields(fields),
    expectedVersion: expectedVersion as number,
  };
}
export function verifiedRow(value: unknown): SettingsRow {
  try {
    if (!value || typeof value !== "object") return settingsUnavailable();
    const row = value as SettingsRow;
    const fields = normalizeFields({
      siteName: row.siteName,
      tagline: row.tagline,
      description: row.description,
      footerText: row.footerText,
    });
    if (
      !Number.isInteger(row.rowVersion) ||
      row.rowVersion < 1 ||
      row.rowVersion > 2147483647
    )
      return settingsUnavailable();
    const date = new Date(row.updatedAt);
    if (!Number.isFinite(date.getTime())) return settingsUnavailable();
    if (
      Object.keys(fields).some(
        (k) =>
          fields[k as keyof SettingsFields] !== row[k as keyof SettingsFields],
      )
    )
      return settingsUnavailable();
    return Object.freeze({
      ...fields,
      rowVersion: row.rowVersion,
      updatedAt: date.toISOString(),
    });
  } catch {
    return settingsUnavailable();
  }
}
export function publicFields(row: SettingsFields): SettingsFields {
  return {
    siteName: row.siteName,
    tagline: row.tagline,
    description: row.description,
    footerText: row.footerText,
  };
}

// Domain validation counts Unicode codepoints; TypeBox maxLength counts UTF-16.
// The HTTP string bound protects parsing; approved lengths are checked by saveInput.

const TextFields = {
  siteName: t.String({ maxLength: 2000 }),
  tagline: t.String({ maxLength: 2000 }),
  description: t.String({ maxLength: 2000 }),
  footerText: t.String({ maxLength: 2000 }),
};
export const SettingsSaveBody = t.Object(
  {
    ...TextFields,
    expectedVersion: t.Integer({ minimum: 1, maximum: 2147483646 }),
  },
  { additionalProperties: false },
);
export const SettingsPublicDto = t.Object(
  {
    item: t.Object(TextFields, { additionalProperties: false }),
    version: t.Integer({ minimum: 1, maximum: 2147483647 }),
    freshForMs: t.Integer({ minimum: 0, maximum: SETTINGS_TTL_MS }),
  },
  { additionalProperties: false },
);
export const SettingsPrivateDto = t.Object(
  {
    item: t.Object(
      {
        ...TextFields,
        rowVersion: t.Integer({ minimum: 1, maximum: 2147483647 }),
        updatedAt: t.String({ format: "date-time" }),
      },
      { additionalProperties: false },
    ),
    freshForMs: t.Integer({ minimum: 0, maximum: SETTINGS_TTL_MS }),
  },
  { additionalProperties: false },
);
