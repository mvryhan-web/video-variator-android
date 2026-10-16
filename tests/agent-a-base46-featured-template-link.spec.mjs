import {test,expect} from '@playwright/test';

// The real backend only publishes owner-approved, rights-cleared templates.
// This synthetic fixture tests navigation, never publishes media or calls an AI provider.
const templates=[
 {id:'app-a',slug:'cinematic-photo',title:'Cinematic Product Photo & Launch',
  description:'Prepare a cinematic product still',category:'Commerce',generationType:'image',
  promptTemplate:'A studio-lit product shot',defaultSettings:{ratio:'1:1'},
  requiredInputTypes:[],active:true,featured:true,sortOrder:1},
 {id:'app-b',slug:'editorial-portrait',title:'Editorial Portrait Light',
  description:'Prepare an editorial portrait',category:'Portrait',generationType:'image',
  promptTemplate:'Editorial portrait with soft lighting',defaultSettings:{},
  requiredInputTypes:[],active:true,featured:true,sortOrder:2}
];
test('BASE 46: selected featured Home card opens the matching AI Apps workflow without paid generation',async({page})=>{
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{},googleClientId:'',
  features:{aiApps:true,inspiration:false,onboarding:false,productVideo:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));
 await page.route('**/api/templates*',r=>r.fulfill({json:{items:templates}}));
 let generationPosts=0;
 page.on('request',request=>{
  if(request.method()==='POST'&&/\/api\/studio\/jobs(?:\?|$)/.test(request.url()))generationPosts++;
 });
 await page.goto('/deepsyq.html');
 await expect(page.locator('#featuredWorkflowGrid a')).toHaveCount(2);
 const first=page.locator('#featuredWorkflowGrid a').first();
 await expect(first).toHaveAttribute('href','ai-apps.html?q=Cinematic%20Product%20Photo%20%26%20Launch');
 await first.click();
 await expect(page).toHaveURL(/ai-apps\.html\?q=Cinematic/);
 await expect(page.locator('#search')).toHaveValue('Cinematic Product Photo & Launch');
 await expect(page.locator('#apps .app-card')).toHaveCount(1);
 await expect(page.locator('#apps .app-card h3')).toHaveText('Cinematic Product Photo & Launch');
 await expect(page.locator('#apps .app-card button').filter({hasText:'Use template'})).toHaveCount(1);
 expect(generationPosts).toBe(0);
});

test('BASE 46: server-authored title is encoded as one search argument (not a URL parameter)',async({page})=>{
 const dangerous={...templates[0],id:'app-special',title:'Summer ?type=video & source=external'};
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{},features:{aiApps:true,inspiration:false,onboarding:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));
 await page.route('**/api/templates*',r=>r.fulfill({json:{items:[dangerous]}}));
 await page.goto('/deepsyq.html');
 const link=page.locator('#featuredWorkflowGrid a').first();
 await expect(link).toBeVisible();
 const href=await link.getAttribute('href');
 const parsed=new URL(href,'http://example.test/');
 expect(parsed.pathname).toBe('/ai-apps.html');
 expect(parsed.searchParams.get('q')).toBe(dangerous.title);
 expect(parsed.searchParams.has('type')).toBe(false);
 expect(parsed.searchParams.has('source')).toBe(false);
});
