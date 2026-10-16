import { expect, test } from "bun:test";
import {
  defaultUrlLifetimes,
  loadUrlLifetimes,
  urlLifetimeBounds,
} from "./playback-env";

test("URL lifetimes default to a day for posters and an hour for video", () => {
  expect(defaultUrlLifetimes).toEqual({
    posterSeconds: 86400,
    hlsMinSeconds: 3600,
  });
  expect(loadUrlLifetimes({})).toEqual(defaultUrlLifetimes);
  // Blank values mean "not set".
  expect(
    loadUrlLifetimes({
      MEDIA_POSTER_URL_TTL_SECONDS: " ",
      MEDIA_HLS_URL_TTL_SECONDS: "",
    }),
  ).toEqual(defaultUrlLifetimes);
});
test("URL lifetimes can be set within the SigV4 limit", () => {
  expect(
    loadUrlLifetimes({
      MEDIA_POSTER_URL_TTL_SECONDS: "604800",
      MEDIA_HLS_URL_TTL_SECONDS: "60",
    }),
  ).toEqual({ posterSeconds: 604800, hlsMinSeconds: 60 });
  expect(urlLifetimeBounds).toEqual({ min: 60, max: 604800 });
});
test("invalid lifetimes fail at start with the variable named", () => {
  for (const [name, value] of [
    ["MEDIA_POSTER_URL_TTL_SECONDS", "59"],
    ["MEDIA_POSTER_URL_TTL_SECONDS", "604801"],
    ["MEDIA_POSTER_URL_TTL_SECONDS", "1.5"],
    ["MEDIA_POSTER_URL_TTL_SECONDS", "-60"],
    ["MEDIA_HLS_URL_TTL_SECONDS", "abc"],
    ["MEDIA_HLS_URL_TTL_SECONDS", "1h"],
    ["MEDIA_HLS_URL_TTL_SECONDS", "0x10"],
  ] as const)
    expect(() => loadUrlLifetimes({ [name]: value })).toThrow(
      new RegExp(
        `^${name} must be a whole number from 60 to 604800 seconds\\.$`,
      ),
    );
});
