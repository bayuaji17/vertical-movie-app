import { describe, expect, test } from "bun:test";
import {
  assessVideoPublication,
  assessSeriesPublication,
  assertSeriesPublication,
  type SeriesPublicationEvidence,
  assertVideoPublication,
  type VideoPublicationEvidence,
} from "./readiness";
const ready = (): VideoPublicationEvidence => ({
  video: {
    kind: "movie",
    publicationStatus: "draft",
    archivedAt: null,
    title: "Title",
    synopsis: "Synopsis",
    rightsConfirmedAt: new Date(),
    rightsConfirmedBy: "admin",
    rowVersion: 2,
  },
  mediaReady: true,
  durationMs: 1800000,
  uploadBusy: false,
  parentsActive: true,
});
describe("publication assessment and command policy", () => {
  test("non-episode needs six checks and no active parent", () => {
    const e = ready();
    e.parentsActive = false;
    expect(assessVideoPublication(e).canPublish).toBe(true);
    expect(assessVideoPublication(e).checks.at(-1)?.status).toBe(
      "not-applicable",
    );
    expect(() => assertVideoPublication(e, 2)).not.toThrow();
  });
  test("requires both rights timestamp and actor", () => {
    for (const field of ["rightsConfirmedAt", "rightsConfirmedBy"] as const) {
      const e = ready();
      e.video[field] = null;
      expect(assessVideoPublication(e).canPublish).toBe(false);
      expect(() => assertVideoPublication(e, 2)).toThrow("Verified HLS");
    }
  });
  test("canonical failed provenance/generation blocks even with valid duration", () => {
    const e = ready();
    e.mediaReady = false;
    expect(assessVideoPublication(e).canPublish).toBe(false);
    expect(() => assertVideoPublication(e, 2)).toThrow("Verified HLS");
  });
  test("duration matches existing limits and integer rules", () => {
    for (const kind of ["movie", "standalone", "episode"] as const) {
      const max = kind === "episode" ? 600000 : 1800000;
      for (const duration of [0, -1, 1.5, NaN, undefined, max + 1]) {
        const e = ready();
        e.video.kind = kind;
        e.durationMs = duration;
        expect(assessVideoPublication(e).canPublish).toBe(false);
        expect(() => assertVideoPublication(e, 2)).toThrow("Verified HLS");
      }
      const e = ready();
      e.video.kind = kind;
      e.durationMs = String(max);
      expect(assessVideoPublication(e).canPublish).toBe(true);
    }
  });
  test("preserves state, version, metadata, upload, media error precedence", () => {
    const e = ready();
    e.video.publicationStatus = "archived";
    e.video.title = " ";
    e.uploadBusy = true;
    e.mediaReady = false;
    expect(() => assertVideoPublication(e, 1)).toThrow("Only an active draft");
    e.video.publicationStatus = "draft";
    expect(() => assertVideoPublication(e, 1)).toThrow("Content has changed");
    expect(() => assertVideoPublication(e, 2)).toThrow("Title and synopsis");
    e.video.title = "Title";
    e.video.synopsis = "\n";
    expect(() => assertVideoPublication(e, 2)).toThrow("Title and synopsis");
    e.video.synopsis = "Synopsis";
    expect(() => assertVideoPublication(e, 2)).toThrow("Finish or abort");
    e.uploadBusy = false;
    expect(() => assertVideoPublication(e, 2)).toThrow("Verified HLS");
  });
  test("episode parent readiness is distinct from non-episode", () => {
    const e = ready();
    e.video.kind = "episode";
    e.durationMs = 1000;
    e.parentsActive = false;
    expect(assessVideoPublication(e).checks.at(-1)?.status).toBe("blocked");
    expect(assessVideoPublication(e).canPublish).toBe(false);
    // Command locks and rejects archived parents before owner assessment.
  });
});

test("Series assessment and command share all checks, record version and error precedence", () => {
  const ready: SeriesPublicationEvidence = {
    series: {
      publicationStatus: "draft",
      archivedAt: null,
      title: "Series",
      synopsis: "Synopsis",
      rowVersion: 4,
    },
    posterReady: true,
    publishedEpisodeReady: true,
    uploadBusy: false,
  };
  expect(assessSeriesPublication(ready).canPublish).toBe(true);
  expect(assessSeriesPublication(ready).checks).toHaveLength(6);
  expect(() => assertSeriesPublication(ready, 4)).not.toThrow();
  const cases: Array<[SeriesPublicationEvidence, string]> = [
    [
      { ...ready, series: { ...ready.series, publicationStatus: "published" } },
      "PUBLICATION_STATE_CONFLICT",
    ],
    [
      { ...ready, series: { ...ready.series, archivedAt: new Date() } },
      "PUBLICATION_STATE_CONFLICT",
    ],
    [
      { ...ready, series: { ...ready.series, title: " " } },
      "PUBLICATION_NOT_READY",
    ],
    [
      { ...ready, series: { ...ready.series, synopsis: null } },
      "PUBLICATION_NOT_READY",
    ],
    [{ ...ready, posterReady: false }, "PUBLICATION_NOT_READY"],
    [{ ...ready, publishedEpisodeReady: false }, "PUBLICATION_NOT_READY"],
    [{ ...ready, uploadBusy: true }, "PUBLICATION_MEDIA_BUSY"],
  ];
  for (const [e, code] of cases) {
    expect(assessSeriesPublication(e).canPublish).toBe(false);
    try {
      assertSeriesPublication(e, 4);
      throw Error("Expected block");
    } catch (error) {
      expect(error).toMatchObject({ code });
    }
  }
  expect(() => assertSeriesPublication(ready, 3)).toThrow(
    "Content has changed.",
  );
  expect(() =>
    assertSeriesPublication(
      { ...ready, uploadBusy: true, posterReady: false },
      4,
    ),
  ).toThrow("Finish or abort");
});
