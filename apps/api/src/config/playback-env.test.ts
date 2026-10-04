import { test, expect } from "bun:test";
import { loadPlaybackBaseUrl } from "./playback-env";
test("playback delivery stays on the web business gateway", () => {
  expect(loadPlaybackBaseUrl(undefined, "http://localhost:3000")).toBe(
    "http://localhost:3000/api",
  );
  expect(loadPlaybackBaseUrl("", "http://localhost:3000")).toBe(
    "http://localhost:3000/api",
  );
  for (const value of [
    "http://localhost:9000/api",
    "http://localhost:3000",
    "http://localhost:3000/api/auth",
    "http://u:p@localhost:3000/api",
    "http://localhost:3000/api?target=x",
  ])
    expect(() => loadPlaybackBaseUrl(value, "http://localhost:3000")).toThrow();
});
