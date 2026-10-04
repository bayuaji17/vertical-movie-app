import { createRequire } from "node:module";
const input = JSON.parse(
  await new Promise((resolve) => {
    let text = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (text += c));
    process.stdin.on("end", () => resolve(text));
  }),
);
const { chromium } = createRequire(import.meta.url)(input.module);
let browser,
  stage = "launch";
try {
  browser = await chromium.launch({
    executablePath: input.executable,
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  let renewals = 0,
    payloads = 0,
    privatePlaylists = true;
  page.on("response", (response) => {
    const url = response.url();
    if (
      url.includes("/playback") &&
      !url.includes("master") &&
      !url.includes("variants")
    )
      renewals++;
    if (url.includes(".m4s") || url.includes("init_")) payloads++;
    if (url.includes("master.m3u8") || url.includes("/variants/"))
      privatePlaylists &&=
        response.headers()["cache-control"] === "private, no-store";
  });
  stage = "page";
  await page.goto(input.origin + "/watch/" + input.slug);
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 2,
    {},
    { timeout: 90000 },
  );
  stage = "play";
  await page.evaluate(() => document.querySelector("video").play());
  await page.waitForFunction(
    () => document.querySelector("video").currentTime > 1,
  );
  const played = true;
  let qualityLabels = true;
  async function qualityMenu() {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.locator("video").hover();
    await page.getByRole("button", { name: /Settings/ }).click();
    await page.getByRole("menuitem", { name: /Quality/ }).click();
  }
  if (input.qualityProof) {
    stage = "quality-select";
    await qualityMenu();
    for (const label of ["480p", "720p", "1080p"])
      qualityLabels &&= await page
        .getByRole("menuitemradio", { name: new RegExp("^" + label) })
        .isVisible();
    await page.getByRole("menuitemradio", { name: /^720p/ }).click();
    await page.waitForFunction(
      () => document.querySelector("video").videoWidth === 720,
      {},
      { timeout: 20000 },
    );
  }

  await page.evaluate(() => {
    const v = document.querySelector("video");
    v.pause();
    v.currentTime = 4;
  });
  if (!input.longSeconds) await page.waitForTimeout(26000);
  stage = "renew";
  if (input.qualityProof && !input.longSeconds) {
    await qualityMenu();
    await page.getByRole("menuitemradio", { name: /^1080p/ }).click();
    await page.waitForTimeout(1500);
  }
  const target = input.longSeconds ? input.longSeconds - 4 : 8;
  await page.evaluate((target) => {
    document.querySelector("video").currentTime = target;
  }, target);
  await page.waitForFunction(
    (target) =>
      document.querySelector("video").readyState >= 2 &&
      document.querySelector("video").currentTime > target - 1,
    target,
    { timeout: 15000 },
  );
  await page.waitForTimeout(1500);
  const value = await page.evaluate(() => {
    const v = document.querySelector("video");
    return {
      position: v.currentTime,
      paused: v.paused,
      played: v.played.length > 0,
    };
  });
  let deniedStopsRenewal = null;
  if (!input.longSeconds) {
    stage = "denied-renewal";
    let denied = 0;
    await page.route("**/api/videos/*/playback", (route) => {
      denied++;
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "CONTENT_NOT_FOUND", message: "Not found" },
        }),
      });
    });
    await page.waitForTimeout(26000);
    await page.evaluate(() => {
      document.querySelector("video").currentTime = 9;
    });
    await page
      .getByRole("alert")
      .filter({ hasText: "Video tidak tersedia" })
      .waitFor({ timeout: 10000 });
    await page.waitForTimeout(2000);
    deniedStopsRenewal = denied === 1;
  }
  process.stdout.write(
    JSON.stringify({
      ...value,
      played,
      renewals,
      payloads,
      privatePlaylists,
      deniedStopsRenewal,
      qualityLabels,
    }),
  );
} catch (error) {
  process.stderr.write(
    JSON.stringify({
      stage,
      name: error.name,
      message: error.message
        .replace(/https?:\/\/\S+/g, "[REDACTED_URL]")
        .slice(0, 200),
    }),
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
}
