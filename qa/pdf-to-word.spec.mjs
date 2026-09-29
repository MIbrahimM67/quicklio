import{test,expect}from'@playwright/test';
import{PDFDocument,StandardFonts,rgb}from'pdf-lib';

async function samplePdf(){
  const d=await PDFDocument.create();const font=await d.embedFont(StandardFonts.Helvetica);const bold=await d.embedFont(StandardFonts.HelveticaBold);
  const p1=d.addPage([612,792]);p1.drawText('Quarterly Report',{x:72,y:720,size:20,font:bold});p1.drawText('Revenue increased during the quarter and customer retention improved.',{x:72,y:680,size:11,font});p1.drawText('This paragraph should become editable Word text.',{x:72,y:662,size:11,font});p1.drawRectangle({x:72,y:500,width:210,height:100,borderWidth:2,borderColor:rgb(.2,.35,.6),color:rgb(.92,.95,1)});p1.drawText('Revenue diagram',{x:95,y:545,size:14,font:bold});
  const p2=d.addPage([612,792]);p2.drawText('Second Page',{x:72,y:720,size:18,font:bold});p2.drawText('Another editable sentence.',{x:72,y:680,size:11,font});
  return Buffer.from(await d.save());
}

test('PDF to Word analyzes selectable text and downloads editable DOCX',async({page})=>{
  await page.goto('/en/pdf/pdf-to-word/');
  await expect(page.locator('h1')).toHaveText('PDF to Word Converter');
  await page.locator('#pdfInput').setInputFiles({name:'report.pdf',mimeType:'application/pdf',buffer:await samplePdf()});
  await expect(page.locator('#fileMeta')).toContainText('2 pages');
  await page.locator('#range').fill('1');
  await page.locator('#analyzeBtn').click();
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#previewText')).toContainText('Quarterly Report');
  await expect(page.locator('#previewText')).toContainText('editable Word text');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#convertBtn').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('report-converted.docx');
  const path=await download.path();expect(path).toBeTruthy();
  const fs=await import('node:fs');const buf=fs.readFileSync(path);
  expect(buf.length).toBeGreaterThan(500);expect(buf.subarray(0,2).toString()).toBe('PK');
});

test('PDF to Word preserve-layout mode embeds rendered PDF pages as media',async({page})=>{
  await page.goto('/en/pdf/pdf-to-word/');
  await page.locator('#pdfInput').setInputFiles({name:'visual-report.pdf',mimeType:'application/pdf',buffer:await samplePdf()});
  await page.locator('#range').fill('1');
  await page.locator('#conversionMode').selectOption('layout');
  await expect(page.locator('#ocrScans')).toBeDisabled();
  await page.locator('#analyzeBtn').click();
  await expect(page.locator('#qualityCallout')).toContainText('images, diagrams, charts');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#convertBtn').click();
  const download=await downloadPromise;const path=await download.path();expect(path).toBeTruthy();
  const fs=await import('node:fs');const buf=fs.readFileSync(path);const binary=buf.toString('latin1');
  expect(buf.length).toBeGreaterThan(3000);expect(binary).toContain('word/media/page-001.png');
});

test('PDF to Word flags image-only pages and fits mobile',async({page})=>{
  const d=await PDFDocument.create();d.addPage([300,400]);
  await page.setViewportSize({width:375,height:812});
  await page.goto('/en/pdf/pdf-to-word/');
  await page.locator('#pdfInput').setInputFiles({name:'scan.pdf',mimeType:'application/pdf',buffer:Buffer.from(await d.save())});
  await page.locator('#analyzeBtn').click();
  await expect(page.locator('#qualityList')).toContainText('No selectable text');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2)).toBeTruthy();
});

test('PDF to Word keeps the desktop page hierarchy intact',async({page})=>{
  for(const viewport of [{width:1366,height:768},{width:1706,height:864}]){
    await page.setViewportSize(viewport);
    await page.goto('/en/pdf/pdf-to-word/');
    await expect(page.locator('[data-tool-review-cta]')).toBeVisible();
    const layout=await page.evaluate(()=>{
      const box=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
      const main=document.querySelector('main');
      const hero=document.querySelector('.pdfword-hero');
      const grid=document.querySelector('.pdfword-grid');
      const copy=document.querySelector('.pdfword-copy');
      const review=document.querySelector('[data-tool-review-cta]');
      const cards=[...document.querySelectorAll('.pdfword-copy .content-card')].slice(0,2).map(box);
      return{mainDisplay:getComputedStyle(main).display,main:box(main),hero:box(hero),grid:box(grid),copy:box(copy),review:box(review),cards,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    });
    expect(layout.mainDisplay).not.toBe('grid');
    expect(layout.overflow).toBeLessThanOrEqual(2);
    expect(layout.main.width).toBeGreaterThan(1000);
    expect(layout.grid.width).toBeGreaterThan(1000);
    expect(layout.copy.width).toBeGreaterThan(1000);
    expect(layout.grid.y).toBeGreaterThanOrEqual(layout.hero.bottom-2);
    expect(layout.copy.y).toBeGreaterThanOrEqual(layout.grid.bottom-2);
    expect(layout.review.y).toBeGreaterThanOrEqual(layout.copy.bottom-2);
    expect(layout.review.width).toBeGreaterThan(900);
    expect(layout.cards).toHaveLength(2);
    expect(layout.cards[0].width).toBeGreaterThan(450);
    expect(layout.cards[1].width).toBeGreaterThan(450);
    expect(Math.abs(layout.cards[0].y-layout.cards[1].y)).toBeLessThanOrEqual(2);
  }
});
