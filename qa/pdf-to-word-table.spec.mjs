import{test,expect}from'@playwright/test';
import{PDFDocument,StandardFonts,rgb}from'pdf-lib';

async function tablePdf(){
  const d=await PDFDocument.create(),font=await d.embedFont(StandardFonts.Helvetica),bold=await d.embedFont(StandardFonts.HelveticaBold);
  const p=d.addPage([612,792]),xs=[72,220,360],ys=[700,675,650],rows=[['Item','Qty','Price'],['Paper','2','$12'],['Ink','1','$25']];
  rows.forEach((row,r)=>row.forEach((text,c)=>p.drawText(text,{x:xs[c],y:ys[r],size:11,font:r===0?bold:font})));
  const left=66,right=430,top=716,bottom=638;
  [left,180,320,right].forEach(x=>p.drawLine({start:{x,y:bottom},end:{x,y:top},thickness:1,color:rgb(.3,.3,.3)}));
  [top,688,663,bottom].forEach(y=>p.drawLine({start:{x:left,y},end:{x:right,y},thickness:1,color:rgb(.3,.3,.3)}));
  return Buffer.from(await d.save());
}

test('PDF to Word detects a table and downloads native-table Hybrid DOCX',async({page})=>{
  await page.goto('/en/pdf/pdf-to-word/');
  await page.locator('#pdfInput').setInputFiles({name:'table-report.pdf',mimeType:'application/pdf',buffer:await tablePdf()});
  await expect(page.locator('#conversionMode')).toHaveValue('hybrid');
  await page.locator('#analyzeBtn').click();
  await expect(page.locator('#qualityList')).toContainText('native table');
  await expect(page.locator('#previewText')).toContainText('[Table 1]');
  await expect(page.locator('#previewText')).toContainText('Paper | 2 | $12');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#convertBtn').click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toBe('table-report-converted.docx');
  const path=await download.path();expect(path).toBeTruthy();
  const fs=await import('node:fs');const buf=fs.readFileSync(path),binary=buf.toString('latin1');
  expect(buf.length).toBeGreaterThan(3000);expect(binary).toContain('word/document.xml');expect(binary).toContain('word/media/visual-001.png');
});
