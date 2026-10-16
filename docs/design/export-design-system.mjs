import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Use an existing Playwright installation; no browser/runtime dependencies are added to the app.
const { chromium } = await import(
  process.env.DESIGN_PLAYWRIGHT_MODULE || process.argv[2] || "playwright"
);
const directory = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(directory, "design-system-final.html"));
const tokens = JSON.parse(
  await readFile(resolve(directory, "design-system.tokens.json"), "utf8"),
);
const server = createServer((_request, response) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(html);
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.DESIGN_BROWSER_EXECUTABLE || process.argv[3],
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`, {
    waitUntil: "load",
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.images].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  const evidence = {
    colorTokenCount: tokens.colors.length,
    themes: {},
    responsive: [],
    browserErrors,
  };
  for (const mode of ["light", "dark"]) {
    await page.evaluate((value) => window.setDesignTheme(value), mode);
    const result = await page.evaluate(
      ({ names, values }) => {
        const board = document.querySelector("#board");
        const style = getComputedStyle(board);
        const mismatch = names.filter((name) => {
          const value = style.getPropertyValue(`--${name}`).trim();
          const label = document.querySelector(
            `[data-value="${name}"]`,
          ).textContent;
          return value !== values[name] || label !== values[name];
        });
        const canvas = document.createElement("canvas");
        const painter = canvas.getContext("2d", { willReadFrequently: true });
        const rgb = (color) => {
          painter.clearRect(0, 0, 1, 1);
          painter.fillStyle = color;
          painter.fillRect(0, 0, 1, 1);
          return [...painter.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const luminance = (color) =>
          rgb(color)
            .map((value) => {
              const n = value / 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            })
            .reduce(
              (sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i],
              0,
            );
        const contrast = (a, b) => {
          const x = luminance(a),
            y = luminance(b);
          return Number(
            ((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2),
          );
        };
        const pairs = [
          "background",
          "card",
          "popover",
          "primary",
          "secondary",
          "muted",
          "accent",
          "sidebar",
          "sidebar-primary",
          "sidebar-accent",
        ];
        const contrasts = Object.fromEntries(
          pairs.map((name) => [
            name,
            contrast(
              style.getPropertyValue(`--${name}`).trim(),
              style
                .getPropertyValue(
                  name === "background"
                    ? "--foreground"
                    : `--${name}-foreground`,
                )
                .trim(),
            ),
          ]),
        );
        const feedbackMatches = Object.fromEntries(
          ["success", "error"].map((kind) => {
            const badge = getComputedStyle(
              document.querySelector(`.status-grid .${kind}`),
            );
            const feedback = getComputedStyle(
              document.querySelector(`.feedback.${kind}`),
            );
            return [
              kind,
              ["backgroundColor", "borderTopColor", "color"].every(
                (property) => badge[property] === feedback[property],
              ),
            ];
          }),
        );
        return {
          mismatch,
          contrasts,
          feedbackMatches,
          background: style.backgroundColor,
          width: board.getBoundingClientRect().width,
          height: board.getBoundingClientRect().height,
          count: document.querySelectorAll("[data-token]").length,
        };
      },
      { names: tokens.colors, values: tokens.themes[mode] },
    );
    assert.deepEqual(
      result.mismatch,
      [],
      `${mode} labels must match CSS tokens`,
    );
    assert.equal(result.count, tokens.colors.length);
    assert.deepEqual(result.feedbackMatches, { success: true, error: true });
    assert.ok(
      result.contrasts.background >= 4.5 && result.contrasts.card >= 4.5,
      JSON.stringify(result.contrasts),
    );
    if (mode === "dark") assert.equal(result.background, "rgb(30, 32, 30)");
    await page.locator("#board").screenshot({
      path: resolve(directory, `design-system-final-${mode}.png`),
    });
    const png = await readFile(
      resolve(directory, `design-system-final-${mode}.png`),
    );
    evidence.themes[mode] = {
      ...result,
      imageWidth: png.readUInt32BE(16),
      imageHeight: png.readUInt32BE(20),
    };
  }
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    for (const mode of ["light", "dark"]) {
      await page.evaluate((value) => window.setDesignTheme(value), mode);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(
        overflow,
        false,
        `${mode}: horizontal overflow at ${width}px`,
      );
      evidence.responsive.push({ width, mode, overflow });
    }
  }
  await page.getByRole("button", { name: "Light mode", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Light mode", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.deepEqual(browserErrors, []);
  await writeFile(
    resolve(directory, "design-system.validation.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
