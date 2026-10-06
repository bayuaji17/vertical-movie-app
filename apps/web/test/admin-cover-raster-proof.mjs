import { resolve } from 'node:path'

const node = Bun.env.AUTH_BROWSER_NODE,
  moduleURL = Bun.env.AUTH_PLAYWRIGHT_MODULE,
  executablePath = Bun.env.AUTH_BROWSER_EXECUTABLE
if (!node || !moduleURL || !executablePath)
  throw new Error(
    'Provide AUTH_BROWSER_NODE, AUTH_PLAYWRIGHT_MODULE and AUTH_BROWSER_EXECUTABLE',
  )

const root = resolve(import.meta.dir, '../../..'),
  work = `${root}/.turbo/admin-cover-processing`
Bun.spawnSync(['mkdir', '-p', work])
const bridgePath = `${work}/cover-raster-browser-bridge.ts`
await Bun.write(
  bridgePath,
  `export {calculateCoverCrop} from '${root}/apps/web/src/lib/admin/cover-crop.ts'; export {decodeCoverImage,exportCoverCrop} from '${root}/apps/web/src/lib/admin/cover-raster.ts';`,
)
const built = await Bun.build({ entrypoints: [bridgePath], target: 'browser' })
if (!built.success) throw new Error('Cover crop browser bridge build failed')
const bridge = await built.outputs[0].text()
const server = Bun.serve({
  hostname: '0.0.0.0',
  port: 0,
  fetch(request) {
    if (new URL(request.url).pathname === '/bridge.js')
      return new Response(bridge, {
        headers: { 'content-type': 'text/javascript' },
      })
    return new Response(
      '<!doctype html><meta charset="utf-8"><script type="module">Object.assign(window,await import("/bridge.js"))</script>',
      { headers: { 'content-type': 'text/html' } },
    )
  },
})

const source = `
const {chromium}=await import(${JSON.stringify(moduleURL)});
const browser=await chromium.launch({executablePath:${JSON.stringify(executablePath)},headless:true});
try {
 const page=await browser.newPage();
 await page.goto(${JSON.stringify(`http://localhost:${server.port}`)});
 await page.waitForFunction(()=>typeof window.exportCoverCrop==='function');
 const result=await page.evaluate(async()=>{
  const encode=(canvas,type,quality)=>new Promise(resolve=>canvas.toBlob(resolve,type,quality));
  const bitmapFromFile=async(file)=>createImageBitmap(file,{imageOrientation:'from-image'});
  const source=document.createElement('canvas');source.width=2160;source.height=3840;
  const ctx=source.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,1080,3840);ctx.fillStyle='#0000ff';ctx.fillRect(1080,0,1080,3840);
  const sourceBlob=await encode(source,'image/png');
  const file=new File([sourceBlob],'portrait.png',{type:sourceBlob.type});
  const bitmap=await window.decodeCoverImage(file);
  const cropLeft=window.calculateCoverCrop(bitmap.width,bitmap.height,{zoom:2,centerX:0});
  const left=await window.exportCoverCrop(bitmap,file.name,cropLeft);
  const cropRight=window.calculateCoverCrop(bitmap.width,bitmap.height,{zoom:2,centerX:1});
  const right=await window.exportCoverCrop(bitmap,file.name,cropRight);
  bitmap.close();
  const readCenter=async(file)=>{const img=await bitmapFromFile(file);const c=document.createElement('canvas');c.width=1;c.height=1;const x=c.getContext('2d');x.drawImage(img,Math.floor(img.width/2),Math.floor(img.height/2),1,1,0,0,1,1);const p=Array.from(x.getImageData(0,0,1,1).data);img.close();return p;};
  const leftPixel=await readCenter(left),rightPixel=await readCenter(right);
  if(left.name!=='portrait.webp'||left.type!=='image/webp'||right.type!=='image/webp')throw new Error('Canvas WebP MIME/extension did not match the output bytes');
  if(leftPixel[0]<200||leftPixel[2]>40||rightPixel[2]<200||rightPixel[0]>40)throw new Error('Panned source rectangle did not reach the expected edges');
  const output=await bitmapFromFile(left);
  if(output.width!==1080||output.height!==1920)throw new Error('Exported raster dimensions are not 1080x1920');
  output.close();
  const actualHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await left.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');

  const originalToBlob=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(callback,_type,quality){return originalToBlob.call(this,callback,'image/png',quality)};
  let pngFallback;const fallbackBitmap=await bitmapFromFile(file);
  try{pngFallback=await window.exportCoverCrop(fallbackBitmap,file.name,window.calculateCoverCrop(2160,3840));}
  finally{fallbackBitmap.close();HTMLCanvasElement.prototype.toBlob=originalToBlob}
  if(pngFallback.type!=='image/png'||pngFallback.name!=='portrait.png')throw new Error('Actual PNG fallback MIME/extension mismatch');

  const noiseCanvas=document.createElement('canvas');noiseCanvas.width=1080;noiseCanvas.height=1920;
  const noisePixels=new Uint8ClampedArray(1080*1920*4);let random=0x12345678;
  for(let i=0;i<noisePixels.length;i+=4){random^=random<<13;random^=random>>>17;random^=random<<5;noisePixels[i]=random&255;noisePixels[i+1]=(random>>>8)&255;noisePixels[i+2]=(random>>>16)&255;noisePixels[i+3]=255;}
  noiseCanvas.getContext('2d').putImageData(new ImageData(noisePixels,1080,1920),0,0);
  const noisyFile=new File([await encode(noiseCanvas,'image/png')],'noise.png',{type:'image/png'});
  const noisyBitmap=await bitmapFromFile(noisyFile);let oversizedRejected=false;
  HTMLCanvasElement.prototype.toBlob=function(callback,_type,quality){return originalToBlob.call(this,callback,'image/png',quality)};
  try{await window.exportCoverCrop(noisyBitmap,noisyFile.name,window.calculateCoverCrop(1080,1920));}
  catch(error){oversizedRejected=error.code==='CROP_OUTPUT_TOO_LARGE'}
  finally{noisyBitmap.close();HTMLCanvasElement.prototype.toBlob=originalToBlob;noiseCanvas.width=0;noiseCanvas.height=0;}
  if(!oversizedRejected)throw new Error('Actual PNG output above 5 MB was not rejected');

  const jpegCanvas=document.createElement('canvas');jpegCanvas.width=600;jpegCanvas.height=400;
  jpegCanvas.getContext('2d').fillRect(0,0,600,400);
  const jpeg= new Uint8Array(await (await encode(jpegCanvas,'image/jpeg',0.9)).arrayBuffer());
  const exif=new Uint8Array([69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]);
  const app1=new Uint8Array(4+exif.length);app1.set([255,225]);new DataView(app1.buffer).setUint16(2,exif.length+2,false);app1.set(exif,4);
  const orientedFile=new File([jpeg.slice(0,2),app1,jpeg.slice(2)],'orientation.jpg',{type:'image/jpeg'});
  const oriented=await window.decodeCoverImage(orientedFile);const orientedDimensions=[oriented.width,oriented.height];oriented.close();
  if(orientedDimensions[0]!==400||orientedDimensions[1]!==600)throw new Error('EXIF orientation was not applied during decode');
  return {browser:navigator.userAgent,source:[2160,3840],output:[1080,1920],webpBytes:left.size,webpSha256:actualHash,webpMime:left.type,pannedPixels:{left:leftPixel,right:rightPixel},pngFallback:{name:pngFallback.name,type:pngFallback.type,bytes:pngFallback.size},oversizedPngRejected:oversizedRejected,exifOrientedDimensions:orientedDimensions};
 });
 console.log(JSON.stringify(result));
} finally { await browser.close(); }
`

try {
  const child = Bun.spawn([node, '--input-type=module', '--eval', source], {
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if ((await child.exited) !== 0)
    throw new Error('Cover crop browser proof failed')
} finally {
  server.stop(true)
}
