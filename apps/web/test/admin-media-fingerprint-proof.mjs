import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../../..')
const work = `${root}/.turbo/admin-media-upload-implementation`
const fixture = `${work}/near-limit.bin`
const size = 1_500_000_000
const chunk = 4 * 1024 * 1024
await Bun.write(
  `${work}/hash-worker.ts`,
  `
import { fingerprintFile } from '${root}/apps/web/src/lib/admin/file-fingerprint-core.ts';
self.onmessage = async ({data}) => {
 try { const digest = await fingerprintFile(data, {onProgress: bytes => self.postMessage({bytes})}); self.postMessage({digest}); }
 catch { self.postMessage({error: true}); }
};`,
)
const built = await Bun.build({
  entrypoints: [`${work}/hash-worker.ts`],
  target: 'browser',
  minify: true,
})
if (!built.success) throw new Error('Hash worker build failed')
const code = await built.outputs[0].text()
const truncate = Bun.spawnSync(['truncate', '-s', String(size), fixture])
if (truncate.exitCode) throw new Error('Fixture allocation failed')
const oracle = createHash('sha256')
const zeros = Buffer.alloc(chunk)
for (let offset = 0; offset < size; offset += chunk)
  oracle.update(zeros.subarray(0, Math.min(chunk, size - offset)))
const expected = oracle.digest('hex')
const server = Bun.serve({
  hostname: '0.0.0.0',
  port: 0,
  fetch(request) {
    if (new URL(request.url).pathname === '/worker.js')
      return new Response(code, {
        headers: { 'content-type': 'text/javascript' },
      })
    return new Response('<input type="file" id="file">', {
      headers: { 'content-type': 'text/html' },
    })
  },
})
const moduleURL = Bun.env.AUTH_PLAYWRIGHT_MODULE
const node = Bun.env.AUTH_BROWSER_NODE
const executablePath = Bun.env.AUTH_BROWSER_EXECUTABLE
if (!moduleURL || !node || !executablePath)
  throw new Error(
    'Provide AUTH_BROWSER_NODE, AUTH_PLAYWRIGHT_MODULE and AUTH_BROWSER_EXECUTABLE',
  )
const windowsFixture = node.endsWith('.exe')
  ? `\\\\wsl.localhost\\${Bun.env.WSL_DISTRO_NAME ?? 'Debian'}${fixture.replaceAll('/', '\\')}`
  : fixture
const browserSource = `
const {chromium} = await import(${JSON.stringify(moduleURL)});
const browser = await chromium.launch({executablePath: ${JSON.stringify(executablePath)}, headless: true, args: ['--enable-precise-memory-info']});
try {
 const page = await browser.newPage();
 await page.goto(${JSON.stringify(`http://localhost:${server.port}`)});
 await page.locator('#file').setInputFiles(${JSON.stringify(windowsFixture)});
 const cdp = await browser.newBrowserCDPSession();
 let heapPeak = 0, backingPeak = 0, workerSession;
 const pending = new Map(); let command = 0;
 cdp.on('Target.receivedMessageFromTarget', ({message}) => { const value=JSON.parse(message); const done=pending.get(value.id); if(done){pending.delete(value.id); done(value.result);} });
 const timer=setInterval(async()=>{
  try {
   if(!workerSession){ const {targetInfos}=await cdp.send('Target.getTargets'); const target=targetInfos.find(x=>x.type==='worker'); if(target) workerSession=(await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false})).sessionId; }
   if(workerSession){ const id=++command; const p=new Promise(r=>pending.set(id,r)); await cdp.send('Target.sendMessageToTarget',{sessionId:workerSession,message:JSON.stringify({id,method:'Runtime.getHeapUsage'})}); const result=await Promise.race([p,new Promise(r=>setTimeout(()=>r(null),1000))]); if(result) {heapPeak=Math.max(heapPeak,result.usedSize);backingPeak=Math.max(backingPeak,result.backingStorageSize ?? 0);} }
  }catch{}
 },100);
 const result=await page.evaluate(async()=>{
  const file=document.querySelector('#file').files[0];
  let ticks=0;const heartbeat=setInterval(()=>ticks++,20); const start=performance.now();
  const value=await new Promise((resolve,reject)=>{const worker=new Worker('/worker.js');let count=0,last=0;worker.onmessage=({data})=>{if(data.bytes){count++;if(data.bytes<last)reject(new Error('Progress regressed'));last=data.bytes;}if(data.digest){worker.terminate();resolve({digest:data.digest,bytes:last,progressEvents:count});}if(data.error)reject(new Error('Hash failed'));};worker.postMessage(file);});
  clearInterval(heartbeat);
  let late=0;await new Promise(resolve=>{const worker=new Worker('/worker.js');worker.onmessage=()=>{worker.terminate();worker.onmessage=()=>late++;setTimeout(resolve,100);};worker.postMessage(file);});
  return {...value,elapsedMs:Math.round(performance.now()-start),heartbeatTicks:ticks,late};
 });
 clearInterval(timer);
 if(result.digest!==${JSON.stringify(expected)}||result.bytes!==${size}||result.heartbeatTicks<2||result.late)throw new Error('Browser hash/cancellation proof failed');
 if(!heapPeak||!backingPeak||heapPeak+backingPeak>256*1024*1024)throw new Error('Worker memory measurement missing or exceeded 256 MiB: '+heapPeak);
 console.log(JSON.stringify({...result,workerHeapPeak:heapPeak,workerBackingPeak:backingPeak,bundleBytes:${code.length},chunkBytes:${chunk}}));
} finally {await browser.close();}
`
try {
  const child = Bun.spawn(
    [node, '--input-type=module', '--eval', browserSource],
    { stdout: 'inherit', stderr: 'inherit' },
  )
  if ((await child.exited) !== 0)
    throw new Error('Browser fingerprint proof failed')
} finally {
  server.stop(true)
  await Bun.file(fixture).delete()
}
