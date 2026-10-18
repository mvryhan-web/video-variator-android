import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const path = file => new URL('../app/src/main/'+file, import.meta.url);
const text = file => readFileSync(path(file), 'utf8');
test('owner-approved exact Deepsyq logo is preserved',()=>{
  const b=readFileSync(path('assets/deepsyq-logo.png'));
  assert.equal(createHash('sha256').update(b).digest('hex'), 'c1d11ed2acdd509209557af6fc8224a3ef5c2325491be19cee0c6cf511dba710');
});
test('site uses approved logo and official install links',()=>{
  const html=text('assets/deepsyq.html');
  assert.equal((html.match(/src="deepsyq-logo.png"/g)||[]).length,2);
  assert.match(html,/href="deepsyq.webmanifest"/);
  assert.match(html,/href="favicon.ico"/);
  assert.match(html,/href="deepsyq-install-192.png"/);
  assert.doesNotMatch(html,/<span class="mark">d\.<\/span>/);
});
test('separate PWA preserves installed legacy Video Uniquifier identity',()=>{
  const pwa=JSON.parse(text('assets/deepsyq.webmanifest'));
  const old=JSON.parse(text('assets/manifest.webmanifest'));
  assert.equal(pwa.short_name,'Deepsyq');
  assert.equal(pwa.start_url,'/deepsyq.html');
  assert.equal(pwa.id,'/deepsyq');
  assert(pwa.icons.some(i=>i.purpose==='maskable'&&i.src==='deepsyq-install-512.png'));
  assert.equal(old.short_name,'Uniquifier');
});
test('Android adaptive launcher uses owner mark without renaming package',()=>{
  for(const x of ['ic_launcher.xml','ic_launcher_round.xml'])
    assert.match(text('res/mipmap-anydpi-v26/'+x), /@drawable\/deepsyq_adaptive_foreground/);
  assert.match(text('AndroidManifest.xml'),/android:label="Video Uniquifier"/);
  assert(readFileSync(path('res/drawable/deepsyq_adaptive_foreground.png')).length>10000);
});

/*
 * Byte-level registry of the ALREADY INSTALLED brand exports from merged
 * PR #126 (Git blob IDs). The transparent 192/512 site icons are also
 * SHA256-identical to the approved original Library ZIP's exports.
 *
 * This does NOT claim every platform export is a byte-identical ZIP file:
 * Android adaptive/maskable/favicon were prepared separately for their
 * platform constraints. Future replacements require owner review.
 */
const brandGitBlobs=Object.freeze({
 'assets/deepsyq-logo.png':'41e7cf2d8550b14f54c83454ee7d24c7ce327962',
 'assets/deepsyq-icon-192.png':'9b474962419656fbceb2e8c3b7250abd1040e865',
 'assets/deepsyq-icon-512.png':'7985402c219dc999789b558791c2834f2c1108fc',
 'assets/deepsyq-install-192.png':'417a4134195de5df2f4c4619c3ea23220888ea76',
 'assets/deepsyq-install-512.png':'46b59d11003c41d9078cbe183c59d39a386fe258',
 'assets/favicon.ico':'2a36e0e33fce1d68593efe8e83db7b5cd4b26479',
 'res/drawable/deepsyq_adaptive_foreground.png':'aa6b72b58449cb7222e49e4dbb85e540dcfd21cd'
});
const approvedTransparentExports=Object.freeze({
 'assets/deepsyq-icon-192.png':'58e229b242ac64518ef28da845b2631a7ec5565e050734a9e457fe25de097c86',
 'assets/deepsyq-icon-512.png':'3bc7a810417afdc00a3d178b48c864a21cb01b6fc8ed0d57a88443ca4143b0ef'
});
function gitBlobSha(bytes){
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function pngSize(bytes){
 assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],'PNG signature required');
 assert.equal(bytes.toString('ascii',12,16),'IHDR','PNG IHDR required');
 return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
}

test('all shipped site/PWA/Android brand assets retain reviewed PR #126 bytes',()=>{
 for(const [file,sha] of Object.entries(brandGitBlobs)){
  const bytes=readFileSync(path(file));
  assert.equal(gitBlobSha(bytes),sha,file+' differs from the reviewed installed asset baseline');
 }
});

test('published web icon sizes are real PNG and match approved Library ZIP exports',()=>{
 const source=readFileSync(path('assets/deepsyq-logo.png'));
 assert.deepEqual(pngSize(source),[1254,1254]);
 for(const [size,sha] of [[192,approvedTransparentExports['assets/deepsyq-icon-192.png']],
                          [512,approvedTransparentExports['assets/deepsyq-icon-512.png']]]){
  const bytes=readFileSync(path('assets/deepsyq-icon-'+size+'.png'));
  assert.deepEqual(pngSize(bytes),[size,size]);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,'expected approved resized export');
 }
});

test('maskable/mobile brand exports are parseable pictures, not empty placeholders',()=>{
 for(const size of [192,512]){
  const bytes=readFileSync(path('assets/deepsyq-install-'+size+'.png'));
  assert.deepEqual(pngSize(bytes),[size,size]);
 }
 const android=pngSize(readFileSync(path('res/drawable/deepsyq_adaptive_foreground.png')));
 assert(android[0]>=256&&android[1]>=256,'Android foreground must have genuine raster resolution');
 assert.equal(android[0],android[1],'Android adaptive icon must be square');
 const ico=readFileSync(path('assets/favicon.ico'));
 assert.deepEqual([...ico.subarray(0,4)],[0,0,1,0],'ICO header required');
 assert(ico.readUInt16LE(4)>0,'favicon must contain at least one image');
});

test('adaptive launcher is available throughout the supported Android API range',()=>{
 const gradle=readFileSync(new URL('../app/build.gradle',import.meta.url),'utf8');
 assert.match(gradle,/\bminSdk\s*=\s*26\b/,'version-26 XML launcher is safe only because app minSdk is 26+');
});
