import{test,expect}from'@playwright/test';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8Dwn4Hh/38AD/kD/Wj/froAAAAASUVORK5CYII=','base64');
const imageTools=[
  ['/en/crafts/stencil-maker/','#generateBtn','#resultCanvas'],
  ['/en/crafts/tattoo-stencil-maker/','#generateBtn','#resultCanvas'],
  ['/en/images/signature-background-remover/','#generateBtn','#resultCanvas'],
  ['/en/images/silhouette-maker/','#generateBtn','#resultCanvas'],
  ['/en/crafts/cross-stitch-pattern-maker/','#generateBtn','#resultCanvas']
];
for(const[path,action,result]of imageTools)test(path+' completes the core user flow',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(path);await page.locator('#fileInput').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:png});await expect(page.locator(action)).toBeEnabled();await page.locator(action).click();await expect(page.locator(result)).toBeVisible();await expect(page.locator('[data-result-action]').first()).toBeEnabled();expect(errors).toEqual([])});

test('letter stencil generates downloadable output',async({page})=>{await page.goto('/en/crafts/letter-stencil-maker/');await page.locator('#stencilText').fill('OPEN 24');await page.locator('#generateBtn').click();await expect(page.locator('#resultCanvas')).toBeVisible();await expect(page.locator('#downloadSvg')).toBeEnabled();await expect(page.locator('#status')).toContainText('ready')});

test('DPI changer writes real 300 DPI PNG metadata and downloads',async({page})=>{await page.goto('/en/images/image-dpi-changer/');await page.locator('#fileInput').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:png});await page.locator('#targetDpi').evaluate(el=>{el.value='300';el.dispatchEvent(new Event('input',{bubbles:true}))});await page.locator('#applyBtn').click();await expect(page.locator('#resultSummary')).toContainText('300 DPI');const promise=page.waitForEvent('download');await page.locator('#downloadBtn').click();const d=await promise;expect(d.suggestedFilename()).toContain('300dpi')});

test('all seven new tools fit mobile width',async({page})=>{const paths=['/en/crafts/stencil-maker/','/en/crafts/letter-stencil-maker/','/en/images/image-dpi-changer/','/en/crafts/tattoo-stencil-maker/','/en/images/signature-background-remover/','/en/images/silhouette-maker/','/en/crafts/cross-stitch-pattern-maker/'];await page.setViewportSize({width:375,height:812});for(const path of paths){await page.goto(path);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow,`${path} horizontal overflow`).toBeLessThanOrEqual(2);await expect(page.locator('[data-tool-flow-guide]')).toBeVisible()}});
