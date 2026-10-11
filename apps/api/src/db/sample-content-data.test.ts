import { expect, test } from "bun:test";

import {
  allVideoSlugs,
  films,
  genreNames,
  shows,
  standalones,
} from "./sample-content-data";

const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const titles = [...films, ...standalones, ...shows];

test("sample titles satisfy the editorial limits and use known genres", () => {
  for (const item of titles) {
    expect(item.slug).toMatch(slug);
    expect(item.slug.length).toBeLessThanOrEqual(180);
    expect(item.title.length).toBeGreaterThan(0);
    expect(item.title.length).toBeLessThanOrEqual(200);
    expect(item.synopsis.length).toBeGreaterThan(0);
    expect(item.synopsis.length).toBeLessThanOrEqual(500);
    expect(item.year).toBeGreaterThanOrEqual(1800);
    expect(item.genres.length).toBeGreaterThan(0);
    for (const genre of item.genres) expect(genreNames).toContain(genre);
  }
});
test("sample slugs are unique and episode slugs follow the series slug", () => {
  expect(new Set(allVideoSlugs).size).toBe(allVideoSlugs.length);
  expect(new Set(titles.map((t) => t.slug)).size).toBe(titles.length);
  for (const show of shows) {
    expect(show.seasons.length).toBeGreaterThan(0);
    for (const [index, episodes] of show.seasons.entries()) {
      expect(episodes.length).toBeGreaterThan(0);
      for (const [n, episode] of episodes.entries()) {
        expect(episode.title.length).toBeLessThanOrEqual(200);
        expect(episode.synopsis.length).toBeLessThanOrEqual(500);
        expect(allVideoSlugs).toContain(`${show.slug}-s${index + 1}e${n + 1}`);
      }
    }
  }
  for (const genre of genreNames) expect(genre.length).toBeLessThanOrEqual(80);
});
test("the sample set covers films, standalone videos and multi-season series", () => {
  expect(films.length).toBeGreaterThanOrEqual(5);
  expect(standalones.length).toBeGreaterThanOrEqual(3);
  expect(shows.some((show) => show.seasons.length > 1)).toBe(true);
});
