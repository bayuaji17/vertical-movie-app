import { createHash } from 'node:crypto'
import { resolve, win32 } from 'node:path'

const moduleURL = Bun.env.AUTH_PLAYWRIGHT_MODULE
const node = Bun.env.AUTH_BROWSER_NODE
const executablePath = Bun.env.AUTH_BROWSER_EXECUTABLE
if (!moduleURL || !node || !executablePath)
  throw new Error(
    'Provide AUTH_BROWSER_NODE, AUTH_PLAYWRIGHT_MODULE and AUTH_BROWSER_EXECUTABLE',
  )
const root = resolve(import.meta.dir, '../../..')
const work = `${root}/.turbo/admin-media-upload-implementation`
const fixture = `${work}/near-limit.bin`
const size = 1_500_000_000
const chunk = 4 * 1024 * 1024
await Bun.write(
  `${work}/hash-bridge.ts`,
  `export {hashFile} from '${root}/apps/web/src/lib/admin/file-fingerprint.ts'; export {describeMediaFile,verifyReselectedFile} from '${root}/apps/web/src/lib/admin/media-file.ts';`,
)
const built = await Bun.build({
  entrypoints: [`${root}/apps/web/src/lib/admin/file-fingerprint.worker.ts`],
  target: 'browser',
  minify: true,
})
const bridgeBuilt = await Bun.build({
  entrypoints: [`${work}/hash-bridge.ts`],
  target: 'browser',
  minify: true,
})
if (!built.success || !bridgeBuilt.success)
  throw new Error('Hash worker/bridge build failed')
const code = await built.outputs[0].text(),
  bridge = await bridgeBuilt.outputs[0].text()
if (Bun.spawnSync(['truncate', '-s', String(size), fixture]).exitCode)
  throw new Error('Fixture allocation failed')
const oracle = createHash('sha256'),
  zeros = Buffer.alloc(chunk)
for (let offset = 0; offset < size; offset += chunk)
  oracle.update(zeros.subarray(0, Math.min(chunk, size - offset)))
const expected = oracle.digest('hex')
const server = Bun.serve({
  hostname: '0.0.0.0',
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/worker.js' || path === '/file-fingerprint.worker.ts')
      return new Response(code, {
        headers: { 'content-type': 'text/javascript' },
      })
    if (path === '/bridge.js')
      return new Response(bridge, {
        headers: { 'content-type': 'text/javascript' },
      })
    return new Response(
      '<input type="file" id="file"><script type="module">Object.assign(window,await import("/bridge.js"))</script>',
      { headers: { 'content-type': 'text/html' } },
    )
  },
})
const diskFixture = node.endsWith('.exe')
  ? win32.join(
      '\\\\wsl.localhost',
      Bun.env.WSL_DISTRO_NAME ?? 'Debian',
      fixture,
    )
  : fixture
const source = `
const {chromium}=await import(${JSON.stringify(moduleURL)});
const browser=await chromium.launch({executablePath:${JSON.stringify(executablePath)},headless:true,args:['--enable-precise-memory-info']});
try {
 const page=await browser.newPage();
 await page.goto(${JSON.stringify(`http://localhost:${server.port}`)});
 await page.waitForFunction(()=>typeof window.hashFile==='function');
 const small=await page.evaluate(async()=>{
  let checked=0;
  for(const n of [0,1,16,17,4194323]){
   const bytes=new Uint8Array(n).map((_,i)=>i%251),file=new File([bytes],'video.mp4');
   const digest=await window.hashFile(file);
   const oracle=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
   if(digest!==oracle)throw new Error('Browser small-file digest mismatch');checked++;
  }
  const correct=new File(['abc'],'video.mp4',{type:'video/mp4'});
  const descriptor={filename:correct.name,contentType:correct.type,sizeBytes:String(correct.size),expectedSha256:await window.hashFile(correct),status:'pending',canResume:true,expiresAt:new Date(Date.now()+60000).toISOString()};
  await window.verifyReselectedFile(correct,descriptor);
  let wrong=false;try{await window.verifyReselectedFile(new File(['abd'],'video.mp4',{type:'video/mp4'}),descriptor);}catch(error){wrong=error.code==='FILE_MISMATCH';}
  if(!wrong)throw new Error('Wrong-file reselection accepted');
  const policy={ownerType:'video',config:{source:{maxBytes:'1500000000',formats:[{extension:'mp4',contentTypes:['video/mp4']}]}}};
  if(window.describeMediaFile(new File(['abc'],'video.mp4'),'source',policy).contentType!=='video/mp4')throw new Error('Empty MIME fallback failed');
  return {checked,wrongFileRejected:wrong,mimeFallback:true};
 });
 await page.locator('#file').setInputFiles(${JSON.stringify(diskFixture)});
 const cdp=await browser.newBrowserCDPSession();let heapPeak=0,backingPeak=0,workerSession;
 const pending=new Map();let command=0;
 cdp.on('Target.receivedMessageFromTarget',({message})=>{const value=JSON.parse(message);const done=pending.get(value.id);if(done){pending.delete(value.id);done(value.result);}});
 let measuring=false;
 const timer=setInterval(async()=>{
  if(measuring)return;measuring=true;
  try{
   if(!workerSession){const {targetInfos}=await cdp.send('Target.getTargets');const target=targetInfos.find(x=>x.type==='worker');if(target)workerSession=(await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false})).sessionId;}
   if(workerSession){const id=++command,p=new Promise(r=>pending.set(id,r));await cdp.send('Target.sendMessageToTarget',{sessionId:workerSession,message:JSON.stringify({id,method:'Runtime.getHeapUsage'})});const result=await Promise.race([p,new Promise(r=>setTimeout(()=>r(null),1000))]);pending.delete(id);if(result){heapPeak=Math.max(heapPeak,result.usedSize);backingPeak=Math.max(backingPeak,result.backingStorageSize??0);}}
  }catch{}finally{measuring=false;}
 },100);
 const result=await page.evaluate(async()=>{
  const file=document.querySelector('#file').files[0];let ticks=0,last=0,progressEvents=0;
  const heartbeat=setInterval(()=>ticks++,20),start=performance.now();
  const timeout=new AbortController(),deadline=setTimeout(()=>timeout.abort(),180000);
  let digest;try{digest=await window.hashFile(file,{signal:timeout.signal,onProgress:bytes=>{if(bytes<last)throw new Error('Progress regressed');last=bytes;progressEvents++;}});}finally{clearTimeout(deadline);clearInterval(heartbeat);}
  const elapsedMs=Math.round(performance.now()-start),controller=new AbortController();let late=0,stopped=false;
  try{await window.hashFile(file,{signal:controller.signal,onProgress:()=>{if(stopped)late++;stopped=true;controller.abort();}});throw new Error('Cancelled hash resolved');}catch(error){if(error.name!=='AbortError')throw error;}
  await new Promise(r=>setTimeout(r,100));
  return {digest,bytes:last,progressEvents,elapsedMs,heartbeatTicks:ticks,late};
 });
 clearInterval(timer);
 if(result.digest!==${JSON.stringify(expected)}||result.bytes!==${size}||result.heartbeatTicks<2||result.late)throw new Error('Browser hash/cancellation proof failed');
 if(!heapPeak||!backingPeak||heapPeak+backingPeak>256*1024*1024)throw new Error('Worker memory measurement missing or exceeded 256 MiB');
 console.log(JSON.stringify({...small,...result,workerHeapPeak:heapPeak,workerBackingPeak:backingPeak,bundleBytes:${code.length},chunkBytes:${chunk}}));
}finally{await browser.close();}
`
try {
  const child = Bun.spawn([node, '--input-type=module', '--eval', source], {
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if ((await child.exited) !== 0)
    throw new Error('Browser fingerprint proof failed')
} finally {
  server.stop(true)
  await Bun.file(fixture).delete()
}
