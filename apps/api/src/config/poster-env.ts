export type PosterEnv = {
  maxPixels: number;
  concurrency: number;
  timeoutSeconds: number;
};

const MAX_PIXELS = 16_777_216;
const OUTPUT_PIXELS = 1080 * 1920;

function positiveInteger(
  source: Record<string, string | undefined>,
  key: string,
  fallback: number,
  maximum: number,
) {
  const value = source[key];
  if (value === undefined) return fallback;
  if (
    !/^[1-9][0-9]*$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > maximum
  ) {
    throw new Error(
      `${key} must be a positive integer no greater than ${maximum}.`,
    );
  }
  return Number(value);
}

export function loadPosterEnv(
  source: Record<string, string | undefined> = Bun.env,
): PosterEnv {
  const maxPixels = positiveInteger(
    source,
    "MEDIA_POSTER_MAX_PIXELS",
    MAX_PIXELS,
    MAX_PIXELS,
  );
  if (maxPixels < OUTPUT_PIXELS)
    throw new Error(
      `MEDIA_POSTER_MAX_PIXELS must be at least ${OUTPUT_PIXELS}.`,
    );

  return {
    maxPixels,
    concurrency: positiveInteger(
      source,
      "MEDIA_POSTER_PROCESS_CONCURRENCY",
      1,
      4,
    ),
    timeoutSeconds: positiveInteger(
      source,
      "MEDIA_POSTER_PROCESS_TIMEOUT_SECONDS",
      20,
      120,
    ),
  };
}
