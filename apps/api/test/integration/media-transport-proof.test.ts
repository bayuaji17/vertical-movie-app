import { test, expect } from "bun:test";
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
} from "@aws-sdk/client-s3";
import { loadStorageEnv } from "../../src/config/storage-env";
import { createMultipartStorage } from "../../src/storage/multipart";
import { createStorageClient } from "../../src/storage/s3";
import { resolve } from "node:path";

async function proveTransport(resume = false) {
  const endpoint = Bun.env.MEDIA_STORAGE_TEST_ENDPOINT;
  if (
    endpoint !== "http://localhost:9000" &&
    endpoint !== "http://127.0.0.1:9000"
  )
    throw Error("Loopback storage required");
  const node = Bun.env.AUTH_BROWSER_NODE,
    module = Bun.env.AUTH_PLAYWRIGHT_MODULE,
    executable = Bun.env.AUTH_BROWSER_EXECUTABLE;
  if (!node || !module || !executable)
    throw Error("Explicit browser runner required");
  const config = loadStorageEnv({
    STORAGE_PROVIDER: "minio",
    S3_ENDPOINT: endpoint,
    S3_REGION: "us-east-1",
    S3_BUCKET:
      "vertical-movie-app-media-test-" + crypto.randomUUID().slice(0, 8),
    S3_ACCESS_KEY_ID: Bun.env.MEDIA_STORAGE_TEST_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: Bun.env.MEDIA_STORAGE_TEST_SECRET_ACCESS_KEY,
  });
  const sdk = new S3Client({
    endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const storage = createMultipartStorage(config),
    native = createStorageClient(config),
    key = "uploads/transport";
  const build = await Bun.build({
    entrypoints: [
      resolve(
        import.meta.dir,
        "../../../web/src/lib/admin/upload-transport.ts",
      ),
    ],
    target: "browser",
    minify: true,
  });
  if (!build.success) throw Error("Transport bundle failed");
  const code = await build.outputs[0]!.text();
  const schedulerBuild = await Bun.build({
    entrypoints: [
      resolve(
        import.meta.dir,
        "../../../web/src/lib/admin/upload-scheduler.ts",
      ),
    ],
    target: "browser",
    minify: true,
  });
  if (!schedulerBuild.success) throw Error("Scheduler bundle failed");
  const schedulerCode = await schedulerBuild.outputs[0]!.text();
  let uploadId: string | undefined,
    server: ReturnType<typeof Bun.serve> | undefined,
    created = false;
  try {
    await sdk.send(new CreateBucketCommand({ Bucket: config.bucket }));
    created = true;
    uploadId = await storage.initiate(key, "application/octet-stream");
    const urls = await Promise.all(
      [1, 2].map((n) => storage.signPart(key, uploadId!, n, 60)),
    );
    const bad = new URL(urls[1]!);
    bad.searchParams.set("X-Amz-Signature", "0".repeat(64));
    if (resume) {
      const stored = await fetch(urls[0]!, {
        method: "PUT",
        body: new Uint8Array(5242880).fill(97),
      });
      expect(stored.ok).toBe(true);
    }
    server = Bun.serve({
      hostname: "0.0.0.0",
      port: 0,
      fetch: async (request) => {
        const path = new URL(request.url).pathname;
        if (path === "/status") {
          const parts = await storage.listParts(key, uploadId!);
          return Response.json({
            id: "proof-upload",
            assetId: "proof-asset",
            status: "pending",
            sizeBytes: "5243904",
            partSizeBytes: "5242880",
            partCount: 2,
            partConcurrency: 3,
            expiresAt: new Date(Date.now() + 60000).toISOString(),
            completedAt: null,
            uploadedBytes: String(
              parts.reduce((sum, p) => sum + p.sizeBytes, 0),
            ),
            parts: parts.map((p) => ({ ...p, sizeBytes: String(p.sizeBytes) })),
            failureCode: null,
            processing: {
              state: "uploading",
              jobState: null,
              progressSeconds: 0,
              attempts: 0,
              failureCode: null,
              verifiedReadyAt: null,
            },
          });
        }
        if (path === "/scheduler.js")
          return new Response(schedulerCode, {
            headers: { "content-type": "text/javascript" },
          });
        return path === "/transport.js"
          ? new Response(code, {
              headers: { "content-type": "text/javascript" },
            })
          : new Response(
              '<script type="module">window.putPart=(await import("/transport.js")).putPart;window.scheduleUpload=(await import("/scheduler.js")).scheduleUpload</script>',
              { headers: { "content-type": "text/html" } },
            );
      },
    });
    const source = `const {chromium}=await import(${JSON.stringify(module)});const input=JSON.parse(await new Promise(r=>{let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>r(s));})); const browser=await chromium.launch({executablePath:${JSON.stringify(executable)},headless:true});try{const page=await browser.newPage();await page.goto(input.origin);await page.waitForFunction(()=>typeof window.putPart==='function');const result=await page.evaluate(async({urls,bad,resume})=>{const bytes=new Uint8Array(5242880+1024).fill(97);bytes.fill(98,5242880);const file=new File([bytes],'transport.bin');let progress=0;if(resume){let signs=0;await window.scheduleUpload({file,id:"proof-upload",client:{status:async()=>await(await fetch("/status")).json(),signPart:async(_id,n)=>{if(n!==2)throw Error("Stored part replayed");signs++;return {partNumber:n,url:urls[n-1],expiresAt:new Date(Date.now()+60000).toISOString(),alreadyUploaded:false};}},signal:new AbortController().signal,onProgress:p=>{if(p.sent>0)progress++;},put:window.putPart});if(signs!==1)throw Error("Unexpected part replay");}else for(let i=0;i<2;i++)await window.putPart(urls[i],file.slice(i*5242880,(i+1)*5242880),{signal:new AbortController().signal,onProgress:n=>{if(n>0)progress++;}});let safe=false;try{await window.putPart(bad,new Blob(['x']),{signal:new AbortController().signal,onProgress:()=>{}});}catch(e){safe=e.status===0&&e.code==='STORAGE_SIGNATURE'&&!String(e).includes('X-Amz');}return {progress,safe};},input);console.log(JSON.stringify(result));}finally{await browser.close();}`;
    const child = Bun.spawn([node, "--input-type=module", "--eval", source], {
      stdin: new Blob([
        JSON.stringify({
          origin: "http://localhost:" + server.port,
          urls,
          bad: bad.href,
          resume,
        }),
      ]),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exit, out] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect(exit).toBe(0);
    const result = JSON.parse(out);
    expect(result.progress).toBeGreaterThan(0);
    expect(result.safe).toBe(true);
    const parts = await storage.listParts(key, uploadId);
    expect(parts.map((p) => p.sizeBytes)).toEqual([5242880, 1024]);
    expect(parts.every((p) => p.etag.length > 0)).toBe(true);
    await storage.complete(key, uploadId, parts);
    uploadId = undefined;
    const bytes = new Uint8Array(await native.file(key).arrayBuffer());
    expect(bytes.length).toBe(5243904);
    expect(bytes.subarray(0, 5242880).every((n) => n === 97)).toBe(true);
    expect(bytes.subarray(5242880).every((n) => n === 98)).toBe(true);
  } finally {
    server?.stop(true);
    if (uploadId) await storage.abort(key, uploadId);
    if (created) {
      await native.delete(key);
      await sdk.send(new DeleteBucketCommand({ Bucket: config.bucket }));
    }
    sdk.destroy();
  }
}
test(
  "production XHR sends exact slices directly to private MinIO with real browser progress and safe signature failure",
  () => proveTransport(),
  60000,
);
test(
  "production scheduler resumes a stored part and verifies remaining bytes before finalization",
  () => proveTransport(true),
  60000,
);
