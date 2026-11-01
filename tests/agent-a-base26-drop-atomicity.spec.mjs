import {test,expect} from '@playwright/test';

// Native DataTransfer/drop events exercise the real Canvas handler, not its internals.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
async function drop(page,files){
 await page.evaluate(items=>{
  const transfer=new DataTransfer();
  for(const item of items)transfer.items.add(new File([new Uint8Array(item.bytes)],item.name,{type:item.type}));
  const target=document.querySelector('#quickCreateDropzone');
  target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
 },files.map(file=>({name:file.name,type:file.type,bytes:[...file.bytes]})));
}
const good=name=>({name,type:'image/png',bytes:png});
for(const width of [320,390,768,1448]){
 test('A36 Canvas drag/drop rejects bad files atomically and preserves real photo previews '+width,async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.addInitScript(()=>localStorage.setItem('vv_token','a36-local-owner'));
  const paid=[];
  page.on('request',r=>{
   if(r.method()==='POST'&&/^\/api\/(?:studio\/jobs|generation\/|billing\/|stripe\/)/.test(new URL(r.url()).pathname))paid.push(r.url());
  });
  await page.goto('/canvas.html');
  await page.locator('#quickCreatePrompt').fill('A36 local image idea');
  await page.locator('#quickCreateFiles').setInputFiles({name:'owner-first.png',mimeType:'image/png',buffer:png});
  const refs=page.locator('#quickCreatePreviews .quick-reference');
  await expect(refs).toHaveCount(1);
  await expect(refs.first()).toContainText('owner-first.png');

  // Atomic invalid drop: keep prior valid owner's reference, do not add text.
  await drop(page,[{name:'unsafe.txt',type:'text/plain',bytes:Buffer.from('private text')}]);
  await expect(page.locator('#quickCreateStatus')).toContainText('Use up to 4 nonempty PNG/JPG photos');
  await expect(refs).toHaveCount(1);
  await expect(refs.first()).toContainText('owner-first.png');

  // Successful native drop appends exactly one image without losing the first.
  await drop(page,[good('owner-second.png')]);
  await expect(refs).toHaveCount(2);
  await expect(refs.nth(0)).toContainText('owner-first.png');
  await expect(refs.nth(1)).toContainText('owner-second.png');
  await refs.first().getByRole('button',{name:'Remove reference 1'}).click();
  await expect(refs).toHaveCount(1);
  await expect(refs.first()).toContainText('owner-second.png');

  // Reject total >4 as one transaction, never silently truncate or corrupt preview list.
  await drop(page,[good('third.png'),good('fourth.png'),good('fifth.png'),good('sixth.png')]);
  await expect(page.locator('#quickCreateStatus')).toContainText('Use up to 4 nonempty PNG/JPG photos');
  await expect(refs).toHaveCount(1);
  await expect(refs.first()).toContainText('owner-second.png');
  await expect(page.locator('#quickCreatePreviews img')).toHaveCount(1);
  await expect(page.locator('#quickCreatePrompt')).toHaveValue('A36 local image idea');
  expect(await page.evaluate(()=>sessionStorage.getItem('deepsyq_studio_handoff_id'))).toBeNull();
  expect(paid).toEqual([]);
 });
}
