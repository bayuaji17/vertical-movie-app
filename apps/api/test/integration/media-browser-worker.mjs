import { createRequire } from "node:module";
const input = JSON.parse(
  await new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  }),
);
const require = createRequire(import.meta.url);
const { chromium } = require(input.module);
let browser;
let stage = "launch";
try {
  browser = await chromium.launch({
    executablePath: input.executable,
    headless: true,
  });
  const page = await browser.newPage();
  stage = "goto";
  await page.goto(input.origin);
  stage = "requests";
  const results = await page.evaluate(
    async ({ partUrls, getUrl, rangeUrl, unsignedUrl, badUrl }) => {
      const etags = [];
      for (let i = 0; i < partUrls.length; i++) {
        const response = await fetch(partUrls[i], {
          method: "PUT",
          body: new Uint8Array(i === 0 ? 5242880 : 1024).fill(97 + i),
        });
        if (!response.ok || !response.headers.get("etag"))
          throw Error("Browser multipart PUT/ETag failed");
        etags.push(response.headers.get("etag"));
      }
      const downloaded = await fetch(getUrl);
      const text = await downloaded.text();
      const range = await fetch(rangeUrl, { headers: { Range: "bytes=0-3" } });
      const rangeBytes = new Uint8Array(await range.arrayBuffer());
      const unsigned = await fetch(unsignedUrl);
      const tampered = await fetch(badUrl);
      return {
        etags,
        getStatus: downloaded.status,
        text,
        rangeStatus: range.status,
        rangeLength: rangeBytes.length,
        unsignedStatus: unsigned.status,
        tamperedStatus: tampered.status,
      };
    },
    input,
  );
  process.stdout.write(JSON.stringify(results));
} catch (error) {
  process.stderr.write(
    JSON.stringify({
      stage,
      name: error?.name,
      code:
        error?.message?.match(/net::[A-Z_]+/)?.[0] ??
        error?.code ??
        "BROWSER_PROOF_FAILED",
    }),
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
}
