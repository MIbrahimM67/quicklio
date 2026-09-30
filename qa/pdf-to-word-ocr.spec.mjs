import{test,expect}from'@playwright/test';
import{PDFDocument}from'pdf-lib';

async function scannedPdf(){
  const d=await PDFDocument.create();const p=d.addPage([300,400]);
  const png=await d.embedPng(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z6x8AAAAASUVORK5CYII=','base64'));
  p.drawImage(png,{x:0,y:0,width:300,height:400});return Buffer.from(await d.save());
}

test('PDF to Word Hybrid uses position-aware OCR without loading external OCR in QA',async({page})=>{
  await page.addInitScript(()=>{
    window.Tesseract={createWorker:async()=>({
      recognize:async()=>({data:{text:'Scanned heading\nEditable OCR line',blocks:[{paragraphs:[{is_ltr:true,lines:[
        {text:'Scanned heading',bbox:{x0:40,y0:80,x1:300,y1:130},baseline:{x0:40,y0:120,x1:300,y1:120},words:[{text:'Scanned',bbox:{x0:40,y0:80,x1:165,y1:130},font_name:'Arial-Bold'},{text:'heading',bbox:{x0:175,y0:80,x1:300,y1:130},font_name:'Arial'}]},
        {text:'Editable OCR line',bbox:{x0:40,y0:155,x1:330,y1:195},baseline:{x0:40,y0:188,x1:330,y1:188},words:[{text:'Editable',bbox:{x0:40,y0:155,x1:150,y1:195},font_name:'Arial'},{text:'OCR',bbox:{x0:160,y0:155,x1:220,y1:195},font_name:'Arial'},{text:'line',bbox:{x0:230,y0:155,x1:330,y1:195},font_name:'Arial'}]}
      ]}]}]}}),terminate:async()=>{}})};
  });
  await page.goto('/en/pdf/pdf-to-word/');
  await page.locator('#pdfInput').setInputFiles({name:'scanned-report.pdf',mimeType:'application/pdf',buffer:await scannedPdf()});
  await expect(page.locator('#conversionMode')).toHaveValue('hybrid');
  await page.locator('#ocrScans').check();
  await page.locator('#analyzeBtn').click();
  await expect(page.locator('#qualityList')).toContainText('Position-aware OCR + visual layer');
  await expect(page.locator('#qualityList')).toContainText('2 positioned OCR lines');
  await expect(page.locator('#previewText')).toContainText('Scanned heading');
  const downloadPromise=page.waitForEvent('download');await page.locator('#convertBtn').click();const download=await downloadPromise;const path=await download.path();expect(path).toBeTruthy();
  const fs=await import('node:fs');const buf=fs.readFileSync(path);const binary=buf.toString('latin1');expect(buf.length).toBeGreaterThan(2500);expect(binary).toContain('word/media/visual-001.png');
});
