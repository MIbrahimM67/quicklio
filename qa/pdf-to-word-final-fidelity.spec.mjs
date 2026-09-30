import{test,expect}from'@playwright/test';
import{PDFDocument}from'pdf-lib';

async function scannedPdf(){
  const d=await PDFDocument.create(),p=d.addPage([300,400]);
  const png=await d.embedPng(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z6x8AAAAASUVORK5CYII=','base64'));
  p.drawImage(png,{x:0,y:0,width:300,height:400});return Buffer.from(await d.save());
}

function ocrLine(text,x0,y0,x1,y1,bold=false){return{text,bbox:{x0,y0,x1,y1},baseline:{x0,y0:y1-4,x1,y1:y1-4},words:[{text,bbox:{x0,y0,x1,y1},font_name:bold?'Arial-Bold':'Arial'}]}}

test('Hybrid reconstructs a scanned OCR table as a native Word table',async({page})=>{
  await page.addInitScript(()=>{
    const line=(text,x0,y0,x1,y1,bold=false)=>({text,bbox:{x0,y0,x1,y1},baseline:{x0,y0:y1-4,x1,y1:y1-4},words:[{text,bbox:{x0,y0,x1,y1},font_name:bold?'Arial-Bold':'Arial'}]});
    const lines=[
      line('Item',45,80,120,104,true),line('Qty',210,80,260,104,true),line('Price',355,80,430,104,true),
      line('Paper',45,120,125,144),line('2',210,120,225,144),line('$12',355,120,395,144),
      line('Ink',45,160,90,184),line('1',210,160,225,184),line('$25',355,160,395,184)
    ];
    window.Tesseract={createWorker:async()=>({recognize:async()=>({data:{text:'Item Qty Price Paper 2 $12 Ink 1 $25',blocks:[{paragraphs:[{is_ltr:true,lines}]}]}}),terminate:async()=>{}})};
  });
  await page.goto('/en/pdf/pdf-to-word/');
  await page.locator('#pdfInput').setInputFiles({name:'scanned-table.pdf',mimeType:'application/pdf',buffer:await scannedPdf()});
  await page.locator('#ocrScans').check();
  await page.locator('#analyzeBtn').click();
  await expect(page.locator('#qualityList')).toContainText('native table');
  await expect(page.locator('#previewText')).toContainText('[Table 1]');
  await expect(page.locator('#previewText')).toContainText('Paper | 2 | $12');
  const downloadPromise=page.waitForEvent('download');await page.locator('#convertBtn').click();const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('scanned-table-converted.docx');const path=await download.path();expect(path).toBeTruthy();
  const fs=await import('node:fs'),buf=fs.readFileSync(path),binary=buf.toString('latin1');expect(buf.length).toBeGreaterThan(2500);expect(binary).toContain('word/document.xml');expect(binary).toContain('word/media/visual-001.png');
});
