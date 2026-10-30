import {test,expect} from '@playwright/test';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const reference=name=>({name,mimeType:'image/png',buffer:png});
const imageModel={
 id:'gemini-3.1-flash-image',label:'Fixture Image Studio',kind:'image',provider:'Google',
 adapter:true,enabled:false,references:2,ratios:['1:1','3:2'],quality:'1K',
 capabilities:{resolutions:['1K'],outputFormats:['auto','png'],ratios:['1:1','3:2']}
};
async function setup(page,width){
 await page.setViewportSize({width,height:850});
 await page.addInitScript(()=>localStorage.setItem('vv_token','a34-local-image-owner'));
 // The provider is deliberately disabled. Only its declared ratio/reference
 // limits are supplied; Canvas, IndexedDB and Studio UI remain REAL modules.
 await page.route('**/api/studio/config',route=>route.fulfill({json:{
  enabled:false,ownerOnly:true,models:[],catalog:[imageModel]
 }}));
 const paid=[];
 page.on('request',request=>{
  const path=new URL(request.url()).pathname;
  if(request.method()==='POST'&&/^\/api\/(?:studio\/jobs|generation\/|billing\/|stripe\/)/.test(path))paid.push(path);
 });
 await page.goto('/canvas.html');
 await expect(page.locator('#quickCreatePrompt')).toBeVisible();
 return paid;
}

for(const width of [320,390,768,1448]){
 test('A34 real Canvas Image ratio, two local references and prepare-only Studio '+width,async({page})=>{
  const paid=await setup(page,width);
  const prompt='Create a realistic editorial interior with the supplied room materials';
  await page.locator('#quickCreatePrompt').fill(prompt);
  await page.locator('#quickCreateKind').selectOption('image');
  await page.locator('#quickCreateRatio').selectOption('3:2');
  await page.locator('#quickCreateFiles').setInputFiles([reference('local-room.png'),reference('local-material.png')]);
  await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(2);
  await page.locator('#quickCreateSubmit').click();
  await expect(page).toHaveURL(/\/generate-studio\.html\?studio=image&from=canvas$/);
  await expect(page.locator('#prompt')).toHaveValue(prompt);
  await expect(page.locator('#ratio')).toHaveValue('3:2');
  await expect(page.locator('#refPreview img')).toHaveCount(2);
  await expect(page.locator('#consent')).not.toBeChecked();
  await expect(page.locator('#generate')).toBeDisabled();
  expect(await page.evaluate(()=>sessionStorage.getItem('deepsyq_studio_handoff_id'))).toBeNull();
  expect(paid).toEqual([]);
 });

 test('A34 Canvas overflow is honestly limited to actual Image model capability '+width,async({page})=>{
  const paid=await setup(page,width);
  await page.locator('#quickCreatePrompt').fill('Compose a poster from three distinct local references');
  await page.locator('#quickCreateFiles').setInputFiles([
   reference('one.png'),reference('two.png'),reference('three.png')
  ]);
  await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(3);
  await page.locator('#quickCreateSubmit').click();
  await expect(page).toHaveURL(/\/generate-studio\.html\?studio=image&from=canvas$/);
  await expect(page.locator('#refPreview img')).toHaveCount(2);
  await expect(page.locator('#status')).toContainText('This model accepts 2 reference file(s), so 1 local file(s) were not attached.');
  await expect(page.locator('#consent')).not.toBeChecked();
  await expect(page.locator('#generate')).toBeDisabled();
  expect(paid).toEqual([]);
 });
}
