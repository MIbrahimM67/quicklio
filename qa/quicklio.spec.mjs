import { test, expect } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const routes=[
  '/en/images/resize-image-to-exact-kb/',
  '/en/pdf/pdf-booklet-signature-maker/',
  '/en/images/photo-to-line-drawing/',
  '/en/social/instagram-no-crop-image-resizer/',
  '/en/finance/payday-bills-planner/',
  '/en/crafts/yarn-amount-calculator/',
  '/en/images/passport-photo-maker/',
  '/en/print/split-image-for-printing/',
  '/en/pdf/add-bleed-and-crop-marks/',
  '/en/labels/barcode-label-sheet-generator/',
  '/en/images/photo-contact-sheet-maker/',
  '/en/pdf/resize-shipping-label-to-4x6/',
  '/en/images/dpi-print-size-calculator/',
  '/en/images/online-image-editor/',
  '/en/pdf/online-pdf-editor/',
  '/en/pdf/merge-pdf/',
  '/en/pdf/split-pdf/',
  '/en/pdf/compress-pdf/',
  '/en/pdf/pdf-to-jpg/',
  '/en/pdf/image-to-pdf/',
  '/en/pdf/add-watermark-to-pdf/',
  '/en/pdf/add-page-numbers-to-pdf/',
  '/en/pdf/crop-pdf/'
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


test('passport photo maker renders 600px US photo and print sheet',async({page})=>{
  await page.goto('/en/images/passport-photo-maker/');
  await page.locator('#fileInput').setInputFiles({name:'portrait.svg',mimeType:'image/svg+xml',buffer:svg(900,1200,'#315dd8')});
  await expect(page.locator('#digitalMeta')).toContainText('600 × 600');
  const size=await page.locator('#resultCanvas').evaluate(c=>({w:c.width,h:c.height}));
  expect(size).toEqual({w:600,h:600});
  await expect(page.locator('#downloadSheet')).toBeEnabled();
  const download=page.waitForEvent('download');
  await page.locator('#downloadSheet').click();
  await download;
  await expect(page.locator('#status')).toContainText('Print sheet ready');
});

test('poster splitter builds tiled PDF',async({page})=>{
  await page.goto('/en/print/split-image-for-printing/');
  await page.locator('#fileInput').setInputFiles({name:'poster.svg',mimeType:'image/svg+xml',buffer:svg(1200,800,'#cc6b3e')});
  await page.locator('#cols').fill('2');
  await page.locator('#rows').fill('2');
  await expect(page.locator('#planMeta')).toContainText('4 pages');
  await page.locator('#buildBtn').click();
  await expect(page.locator('#downloadBtn')).toBeEnabled({timeout:15000});
  await expect(page.locator('#status')).toContainText('Poster PDF ready');
  expect(await page.locator('#pdfPreview').getAttribute('src')).toMatch(/^blob:/);
});

test('bleed tool builds crop-mark PDF from source PDF',async({page})=>{
  const doc=await PDFDocument.create();const p=doc.addPage([360,504]);p.drawRectangle({x:0,y:0,width:360,height:504,color:rgb(.95,.8,.3)});const pdf=Buffer.from(await doc.save());
  await page.goto('/en/pdf/add-bleed-and-crop-marks/');
  await page.locator('#fileInput').setInputFiles({name:'artwork.pdf',mimeType:'application/pdf',buffer:pdf});
  await expect(page.locator('#settings')).toBeVisible();
  await page.locator('#buildBtn').click();
  await expect(page.locator('#downloadBtn')).toBeEnabled({timeout:15000});
  await expect(page.locator('#status')).toContainText('Print-ready PDF created');
  expect(await page.locator('#preview').getAttribute('src')).toMatch(/^blob:/);
});

test('barcode label tool builds Code128 PDF from CSV',async({page})=>{
  await page.goto('/en/labels/barcode-label-sheet-generator/');
  await expect(page.locator('#recordCount')).toContainText('3 records');
  await expect(page.locator('#buildBtn')).toBeEnabled();
  await page.locator('#buildBtn').click();
  await expect(page.locator('#downloadBtn')).toBeEnabled({timeout:15000});
  await expect(page.locator('#status')).toContainText('Label sheet PDF ready');
  expect(await page.locator('#pdfPreview').getAttribute('src')).toMatch(/^blob:/);
});

test('contact sheet builds PDF from three images',async({page})=>{
  await page.goto('/en/images/photo-contact-sheet-maker/');
  await page.locator('#fileInput').setInputFiles([
    {name:'one.svg',mimeType:'image/svg+xml',buffer:svg(800,600,'#348f18')},
    {name:'two.svg',mimeType:'image/svg+xml',buffer:svg(600,800,'#315dd8')},
    {name:'three.svg',mimeType:'image/svg+xml',buffer:svg(700,700,'#cc6b3e')}
  ]);
  await expect(page.locator('#fileCount')).toContainText('3 images');
  await page.locator('#buildBtn').click();
  await expect(page.locator('#downloadBtn')).toBeEnabled({timeout:15000});
  await expect(page.locator('#status')).toContainText('Contact sheet PDF ready');
});

test('shipping label tool converts source PDF to 4x6',async({page})=>{
  const doc=await PDFDocument.create();const p=doc.addPage([612,792]);p.drawRectangle({x:20,y:420,width:572,height:340,color:rgb(.95,.95,.95)});p.drawText('SHIP TO',{x:60,y:700,size:30});const pdf=Buffer.from(await doc.save());
  await page.goto('/en/pdf/resize-shipping-label-to-4x6/');
  await page.locator('#pdfInput').setInputFiles({name:'label.pdf',mimeType:'application/pdf',buffer:pdf});
  await expect(page.locator('#settings')).toBeVisible();
  await page.locator('#cropPreset').selectOption('top');
  await page.locator('#buildBtn').click();
  await expect(page.locator('#downloadBtn')).toBeEnabled({timeout:15000});
  await expect(page.locator('#status')).toContainText('4 × 6 PDF ready');
  expect(await page.locator('#preview').getAttribute('src')).toMatch(/^blob:/);
});

test('DPI calculator returns 300 DPI for 6000px at 20in',async({page})=>{
  await page.goto('/en/images/dpi-print-size-calculator/');
  await page.locator('#pxWidth').fill('6000');
  await page.locator('#pxHeight').fill('4000');
  await page.locator('#printWidth').fill('20');
  await page.locator('#printHeight').fill('13.333333');
  await expect(page.locator('#primaryValue')).toContainText('300 DPI');
  await expect(page.locator('#quality')).toContainText('High-quality photo');
});


test('contact sheet drag reorder changes thumbnail order',async({page})=>{
  await page.goto('/en/images/photo-contact-sheet-maker/');
  await page.locator('#fileInput').setInputFiles([
    {name:'first.svg',mimeType:'image/svg+xml',buffer:svg(800,600,'#348f18')},
    {name:'second.svg',mimeType:'image/svg+xml',buffer:svg(600,800,'#315dd8')},
    {name:'third.svg',mimeType:'image/svg+xml',buffer:svg(700,700,'#cc6b3e')}
  ]);
  await expect(page.locator('.reorder-thumb')).toHaveCount(3);
  await expect(page.locator('.reorder-thumb').nth(0)).toHaveAttribute('aria-label',/first\.svg/);
  await page.locator('.reorder-thumb').nth(0).dragTo(page.locator('.reorder-thumb').nth(2));
  await expect(page.locator('.reorder-thumb').nth(2)).toHaveAttribute('aria-label',/first\.svg/);
  await expect(page.locator('#status')).toContainText('Photo order updated');
});

test('online image editor adds text and exports',async({page})=>{
  await page.goto('/en/images/online-image-editor/');
  await page.locator('#fileInput').setInputFiles({name:'edit.svg',mimeType:'image/svg+xml',buffer:svg(900,700,'#315dd8')});
  await expect(page.locator('#workspace')).toBeVisible();
  await page.locator('#textValue').fill('Quicklio');
  await page.locator('#addTextBtn').click();
  await expect(page.locator('#canvasMeta')).toContainText('900 × 700');
  const download=page.waitForEvent('download');
  await page.locator('#downloadBtn').click();
  await download;
  await expect(page.locator('#status')).toContainText('Image exported');
});

test('online PDF editor annotates reorders and exports',async({page})=>{
  const doc=await PDFDocument.create();
  for(let i=1;i<=3;i++){const p=doc.addPage([432,648]);p.drawText('Page '+i,{x:150,y:320,size:28});}
  const pdf=Buffer.from(await doc.save());
  await page.goto('/en/pdf/online-pdf-editor/');
  await page.locator('#pdfInput').setInputFiles({name:'editor.pdf',mimeType:'application/pdf',buffer:pdf});
  await expect(page.locator('.pdf-page-thumb')).toHaveCount(3,{timeout:15000});
  await page.locator('#textValue').fill('Approved');
  await page.locator('#addTextBtn').click();
  await expect(page.locator('.pdf-page-thumb').nth(0)).toContainText('Edited');
  await page.locator('.pdf-page-thumb').nth(2).dragTo(page.locator('.pdf-page-thumb').nth(0));
  await expect(page.locator('#status')).toContainText('Page order updated');
  const download=page.waitForEvent('download');
  await page.locator('#exportBtn').click();
  await download;
  await expect(page.locator('#status')).toContainText('Edited PDF exported',{timeout:15000});
});


test('merge PDF combines two fixtures',async({page})=>{
  const a=await PDFDocument.create();a.addPage([300,400]).drawText('A');
  const b=await PDFDocument.create();b.addPage([300,400]).drawText('B');
  await page.goto('/en/pdf/merge-pdf/');
  await page.locator('#pdfInput').setInputFiles([
    {name:'a.pdf',mimeType:'application/pdf',buffer:Buffer.from(await a.save())},
    {name:'b.pdf',mimeType:'application/pdf',buffer:Buffer.from(await b.save())}
  ]);
  await expect(page.locator('.merge-file-row')).toHaveCount(2);
  const download=page.waitForEvent('download');
  await page.locator('#mergeBtn').click();
  await download;
  await expect(page.locator('#status')).toContainText('Merged PDF downloaded');
});

test('split PDF extracts selected pages',async({page})=>{
  const d=await PDFDocument.create();for(let i=0;i<3;i++)d.addPage([300,400]).drawText('P'+(i+1));
  await page.goto('/en/pdf/split-pdf/');
  await page.locator('#pdfInput').setInputFiles({name:'three.pdf',mimeType:'application/pdf',buffer:Buffer.from(await d.save())});
  await page.locator('#range').fill('1-2');
  const download=page.waitForEvent('download');
  await page.locator('#processBtn').click();
  await download;
  await expect(page.locator('#status')).toContainText('2 pages downloaded');
});

test('watermark PDF produces output',async({page})=>{
  const d=await PDFDocument.create();d.addPage([400,500]).drawText('Source');
  await page.goto('/en/pdf/add-watermark-to-pdf/');
  await page.locator('#pdfInput').setInputFiles({name:'source.pdf',mimeType:'application/pdf',buffer:Buffer.from(await d.save())});
  await page.locator('#watermarkText').fill('DRAFT');
  const download=page.waitForEvent('download');
  await page.locator('#processBtn').click();
  await download;
  await expect(page.locator('#status')).toContainText('Watermarked PDF downloaded');
});

test('page numbers PDF produces output',async({page})=>{
  const d=await PDFDocument.create();d.addPage([400,500]);d.addPage([400,500]);
  await page.goto('/en/pdf/add-page-numbers-to-pdf/');
  await page.locator('#pdfInput').setInputFiles({name:'numbers.pdf',mimeType:'application/pdf',buffer:Buffer.from(await d.save())});
  await page.locator('#prefix').fill('Page ');
  const download=page.waitForEvent('download');
  await page.locator('#processBtn').click();
  await download;
  await expect(page.locator('#status')).toContainText('Numbered PDF downloaded');
});

test('compress PDF creates preview and download',async({page})=>{
  const d=await PDFDocument.create();const p=d.addPage([432,648]);p.drawText('Compression fixture',{x:50,y:500,size:30});p.drawRectangle({x:40,y:200,width:350,height:200,color:rgb(.3,.6,.8)});
  await page.goto('/en/pdf/compress-pdf/');
  await page.locator('#pdfInput').setInputFiles({name:'compress.pdf',mimeType:'application/pdf',buffer:Buffer.from(await d.save())});
  await page.locator('#quality').selectOption('small');
  await page.locator('#compressBtn').click();
  await expect(page.locator('#downloadBtn')).toBeEnabled({timeout:15000});
  await expect(page.locator('#resultMeta')).toContainText('MB');
  await expect(page.locator('#status')).toContainText('Compressed PDF ready');
});

test('PDF to JPG renders all pages',async({page})=>{
  const d=await PDFDocument.create();d.addPage([300,400]).drawText('One');d.addPage([300,400]).drawText('Two');
  await page.goto('/en/pdf/pdf-to-jpg/');
  await page.locator('#pdfInput').setInputFiles({name:'pages.pdf',mimeType:'application/pdf',buffer:Buffer.from(await d.save())});
  await page.locator('#convertBtn').click();
  await expect(page.locator('.batch-card')).toHaveCount(2,{timeout:15000});
  await expect(page.locator('#downloadZip')).toBeEnabled();
});

test('images to PDF respects image batch and downloads',async({page})=>{
  await page.goto('/en/pdf/image-to-pdf/');
  await page.locator('#fileInput').setInputFiles([
    {name:'a.svg',mimeType:'image/svg+xml',buffer:svg(800,600,'#348f18')},
    {name:'b.svg',mimeType:'image/svg+xml',buffer:svg(600,800,'#315dd8')}
  ]);
  await expect(page.locator('.reorder-thumb')).toHaveCount(2);
  const download=page.waitForEvent('download');
  await page.locator('#buildBtn').click();
  await download;
  await expect(page.locator('#status')).toContainText('PDF downloaded');
});

test('crop PDF downloads cropped pages',async({page})=>{
  const d=await PDFDocument.create();d.addPage([612,792]).drawText('Crop me',{x:80,y:600,size:24});
  await page.goto('/en/pdf/crop-pdf/');
  await page.locator('#pdfInput').setInputFiles({name:'crop.pdf',mimeType:'application/pdf',buffer:Buffer.from(await d.save())});
  await page.locator('#left').fill('10');
  await page.locator('#right').fill('10');
  const download=page.waitForEvent('download');
  await page.locator('#processBtn').click();
  await download;
  await expect(page.locator('#status')).toContainText('Cropped PDF downloaded');
});


test('contact sheet drag reorder updates photo order',async({page})=>{
  await page.goto('/en/images/photo-contact-sheet-maker/');
  await page.locator('#fileInput').setInputFiles([
    {name:'first.svg',mimeType:'image/svg+xml',buffer:svg(800,600,'#348f18')},
    {name:'second.svg',mimeType:'image/svg+xml',buffer:svg(600,800,'#315dd8')},
    {name:'third.svg',mimeType:'image/svg+xml',buffer:svg(700,700,'#cc6b3e')}
  ]);
  const thumbs=page.locator('.reorder-thumb');
  await expect(thumbs).toHaveCount(3);
  await expect(thumbs.nth(0)).toContainText('first.svg');
  await thumbs.nth(0).dragTo(thumbs.nth(2));
  await expect(page.locator('.reorder-thumb').nth(2)).toContainText('first.svg');
  await expect(page.locator('#status')).toContainText('Photo order updated');
});
