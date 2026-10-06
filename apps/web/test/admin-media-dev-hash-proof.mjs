import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const node = Bun.env.AUTH_BROWSER_NODE,
  moduleURL = Bun.env.AUTH_PLAYWRIGHT_MODULE,
  executablePath = Bun.env.AUTH_BROWSER_EXECUTABLE
assert.ok(node && moduleURL && executablePath, 'Provide the browser runner env')
const web = resolve(import.meta.dir, '..'),
  work = resolve(web, '../../.turbo/admin-cover-processing/acov-012')
await mkdir(work, { recursive: true })
const cache = await mkdtemp(`${work}/vite-`)
const reservation = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: () => new Response(null, { status: 503 }),
})
const port = reservation.port
reservation.stop(true)
const originalDirectory = process.cwd()
const originalPort = process.env.PORT
// The application's framework plugins also read PORT during configuration.
process.env.PORT = String(port)
process.chdir(web)
let server
try {
  server = await createServer({
    configFile: resolve(web, 'vite.config.ts'),
    cacheDir: cache,
    server: { host: '127.0.0.1', port, strictPort: true },
    plugins: [
      {
        name: 'media-hash-proof',
        configureServer(vite) {
          vite.middlewares.use(async (request, response, next) => {
            if (request.url !== '/__media-hash-proof') return next()
            response.setHeader('Content-Type', 'text/html')
            try {
              const html = `<!doctype html><meta charset="utf-8">
              <input type="file" id="file"><script type="module">
              import '/@vite/client';
              import '/src/components/admin/media-panel.tsx';
              import {hashFile} from '/src/lib/admin/file-fingerprint.ts';
              window.proof = {token: crypto.randomUUID(), ready: true, reloads: 0, phase: 'idle'};
              import.meta.hot?.on('vite:beforeFullReload', () => window.proof.reloads++);
              window.addEventListener('beforeunload', event => {
                if (window.proof.phase === 'checking') {
                  event.preventDefault(); event.returnValue = '';
                }
              });
              document.querySelector('#file').addEventListener('change', async event => {
                window.proof.phase = 'checking';
                try {
                  window.proof.digest = await hashFile(event.target.files[0]);
                  window.proof.phase = 'complete';
                } catch (error) {
                  window.proof.error = error.message;
                  window.proof.phase = 'failed';
                }
              });
              </script>`
              response.end(
                await vite.transformIndexHtml('/__media-hash-proof', html),
              )
            } catch (error) {
              next(error)
            }
          })
        },
      },
    ],
  })
  await server.listen()
  const address = server.httpServer.address()
  assert.ok(address && typeof address === 'object')
  const bytes = Buffer.alloc(5_000_000, 0x5a),
    expected = createHash('sha256').update(bytes).digest('hex')
  const source = `
    import assert from 'node:assert/strict';
    const {chromium} = await import(${JSON.stringify(moduleURL)});
    const browser = await chromium.launch({headless: true, executablePath: ${JSON.stringify(executablePath)}});
    try {
      const page = await browser.newPage();
      const dialogs = [], errors = [];
      page.on('dialog', async dialog => {dialogs.push(dialog.type()); await dialog.dismiss()});
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:${address.port}/__media-hash-proof');
      await page.waitForFunction(() => window.proof?.ready);
      const token = await page.evaluate(() => window.proof.token);
      let navigations = 0;
      page.on('framenavigated', frame => {if (frame === page.mainFrame()) navigations++});
      for (let attempt = 0; attempt < 2; attempt++) {
        await page.locator('#file').setInputFiles({name:'cover.webp', mimeType:'image/webp', buffer:Buffer.alloc(5000000, 0x5a)});
        await page.waitForFunction(() => ['complete','failed'].includes(window.proof?.phase));
        const result = await page.evaluate(() => window.proof);
        assert.equal(result.phase, 'complete', result.error);
        assert.equal(result.digest, ${JSON.stringify(expected)});
        assert.equal(result.token, token);
      }
      // The optimizer schedules its reload after bundling. Observe that window
      // as well as the hash result so a fast File does not hide the regression.
      await new Promise(resolve => setTimeout(resolve, 2000));
      assert.equal(await page.evaluate(() => window.proof.reloads), 0);
      assert.equal(await page.evaluate(() => window.proof.token), token);
      assert.equal(navigations, 0, 'Hashing must not reload the document');
      assert.deepEqual(dialogs, []);
      assert.deepEqual(errors, []);
      console.log('Browser: cold Vite cache, first/repeated 5 MB hash, exact SHA-256, zero document reloads and zero dialogs passed');
    } finally {await browser.close()}
  `
  const child = Bun.spawn([node, '--input-type=module', '--eval', source], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (stdout) console.log(stdout.trim())
  if (stderr) console.error(stderr.trim())
  assert.equal(code, 0, 'Cold development hashing proof must pass')
} finally {
  await server?.close()
  process.chdir(originalDirectory)
  if (originalPort === undefined) delete process.env.PORT
  else process.env.PORT = originalPort
  await rm(cache, { recursive: true, force: true })
}
process.exit(0)
