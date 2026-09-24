import { test, expect } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const routes=[
  '/en/images/resize-image-to-exact-kb/',
  '/en/pdf/pdf-booklet-signature-maker/',
  '/en/images/photo-to-line-drawing/',
  '/en/social/instagram-no-crop-image-resizer/',
  '/en/finance/payday-bills-planner/',
  '/en/crafts/yarn-amount-calculator/'
];

const svg=(w=800,h=600,accent='#348f18')=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="100%" height="100%" fill="#f7f2e8"/><circle cx="${w*.32}" cy="${h*.46}" r="${Math.min(w,h)*.22}" fill="${accent}"/>
<rect x="${w*.52}" y="${h*.22}" width="${w*.28}" height="${h*.52}" rx="24" fill="#25251f"/>
<path d="M${w*.08} ${h*.82} Q${w*.35} ${h*.55} ${w*.9} ${h*.78}" fill="none" stroke="#cc6b3e" stroke-width="18"/>
</svg>`);

async function assertHealthy(page){
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(250);
  expect(errors,errors.join('\n')).toEqual([]);
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2);
  expect(noOverflow).toBeTruthy();
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.site-header')).toBeVisible();
}

for(const width of [1440,375]){
  test.describe(`layout ${width}px`,()=>{
    for(const route of routes){
      test(`${route} has no horizontal overflow`,async({page})=>{
        await page.setViewportSize({width,height:width===375?812:1000});
        await page.goto(route);
        await assertHealthy(page);
      });
    }
  });
}

test('exact KB image resizer creates constrained output',async({page})=>{
  await page.goto('/en/images/resize-image-to-exact-kb/');
  await page.locator('#fileInput').setInputFiles({name:'photo.svg',mimeType:'image/svg+xml',buffer:svg()});
  await expect(page.locator('#originalMeta')).toContainText('800 × 600');
  await page.locator('#width').fill('200');
  await page.locator('#height').fill('230');
  await page.locator('#maxKb').fill('50');
  await page.locator('#processBtn').click();
  await expect(page.locator('#resultPanel')).toBeVisible();
  await expect(page.locator('#resultMeta')).toContainText('200 × 230');
  await expect(page.locator('#resultMeta')).toContainText('KB');
  await expect(page.locator('#downloadBtn')).toBeEnabled();
});

test('photo to line art renders a canvas',async({page})=>{
  await page.goto('/en/images/photo-to-line-drawing/');
  await page.locator('#fileInput').setInputFiles({name:'subject.svg',mimeType:'image/svg+xml',buffer:svg(900,700,'#7148aa')});
  await expect(page.locator('#previews')).toBeVisible();
  await expect(page.locator('#status')).toContainText('Preview ready');
  const size=await page.locator('#resultCanvas').evaluate(c=>({w:c.width,h:c.height}));
  expect(size.w).toBeGreaterThan(0);
  expect(size.h).toBeGreaterThan(0);
});

test('Instagram no-crop processes a two-image batch',async({page})=>{
  await page.goto('/en/social/instagram-no-crop-image-resizer/');
  await page.locator('#fileInput').setInputFiles([
    {name:'wide.svg',mimeType:'image/svg+xml',buffer:svg(1200,600,'#348f18')},
    {name:'tall.svg',mimeType:'image/svg+xml',buffer:svg(600,1200,'#315dd8')}
  ]);
  await expect(page.locator('#fileCount')).toContainText('2 images');
  await page.locator('#background').selectOption('blur');
  await page.locator('#processBtn').click();
  await expect(page.locator('#resultPanel')).toBeVisible();
  await expect(page.locator('.batch-card')).toHaveCount(2);
  await expect(page.locator('#downloadAll')).toBeEnabled();
});

test('payday planner projects known cash flow',async({page})=>{
  await page.goto('/en/finance/payday-bills-planner/');
  await page.locator('#startDate').fill('2026-10-01');
  await page.locator('#balance').fill('500');
  await page.locator('#nextPayday').fill('2026-10-10');
  await page.locator('#payAmount').fill('1000');
  await page.locator('#frequency').selectOption('monthly');
  await page.locator('#horizon').selectOption('30');
  const row=page.locator('.bill-row').first();
  await row.locator('input').nth(0).fill('Rent');
  await row.locator('input').nth(1).fill('5');
  await row.locator('input').nth(2).fill('300');
  await page.locator('#calculateBtn').click();
  await expect(page.locator('#safe')).toContainText('200');
  await expect(page.locator('#minimum')).toContainText('200');
  await expect(page.locator('#ending')).toContainText('1,200');
  await expect(page.locator('#timeline tr')).toHaveCount(2);
});

test('yarn calculator uses swatch area and returns ball count',async({page})=>{
  await page.goto('/en/crafts/yarn-amount-calculator/');
  await page.locator('#projectWidth').fill('40');
  await page.locator('#projectHeight').fill('50');
  await page.locator('#swatchWidth').fill('4');
  await page.locator('#swatchHeight').fill('5');
  await page.locator('#swatchYarn').fill('10');
  await page.locator('#buffer').fill('10');
  await page.locator('#ballLength').fill('220');
  await expect(page.locator('#totalYarn')).toContainText('1,100');
  await expect(page.locator('#balls')).toHaveText('5');
});

test('PDF booklet maker builds an 8-page imposed PDF',async({page})=>{
  const doc=await PDFDocument.create();
  const font=await doc.embedFont(StandardFonts.Helvetica);
  for(let i=1;i<=8;i++){
    const p=doc.addPage([432,648]);
    p.drawText(`Page ${i}`,{x:150,y:320,size:28,font,color:rgb(.12,.12,.12)});
  }
  const pdf=Buffer.from(await doc.save());
  await page.goto('/en/pdf/pdf-booklet-signature-maker/');
  await page.locator('#pdfInput').setInputFiles({name:'eight-pages.pdf',mimeType:'application/pdf',buffer:pdf});
  await expect(page.locator('#settings')).toBeVisible();
  await expect(page.locator('#fileMeta')).toContainText('8 pages');
  await page.locator('#signatureSize').selectOption('8');
  await page.locator('#buildBtn').click();
  await expect(page.locator('#downloadBtn')).toBeEnabled({timeout:15000});
  await expect(page.locator('#status')).toContainText('Booklet PDF ready');
  const src=await page.locator('#preview').getAttribute('src');
  expect(src).toMatch(/^blob:/);
});
