import{test,expect}from'@playwright/test';
import{PDFDocument,rgb,cmyk}from'pdf-lib';

async function mixedPdf(){
  const doc=await PDFDocument.create();
  const rgbPage=doc.addPage([420,560]);
  rgbPage.drawRectangle({x:40,y:320,width:220,height:130,color:rgb(.9,.2,.15)});
  rgbPage.drawText('RGB artwork',{x:50,y:280,size:22,color:rgb(.1,.3,.8)});
  const cmykPage=doc.addPage([420,560]);
  cmykPage.drawRectangle({x:40,y:320,width:220,height:130,color:cmyk(.1,.9,.2,.05)});
  cmykPage.drawText('CMYK artwork',{x:50,y:280,size:22,color:cmyk(.8,.25,.05,.1)});
  return Buffer.from(await doc.save({useObjectStreams:false}));
}

test('PDF color checker detects mixed RGB and CMYK paint operations',async({page})=>{
  await page.goto('/en/pdf/pdf-color-space-checker/');
  await expect(page.locator('h1')).toHaveText('PDF Color Space Checker');
  await page.locator('#pdfInput').setInputFiles({name:'mixed-color.pdf',mimeType:'application/pdf',buffer:await mixedPdf()});
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#verdict')).toContainText('Mixed RGB + CMYK signals');
  await expect(page.locator('#fileMeta')).toContainText('2 pages');
  await expect(page.locator('#pageRows tr')).toHaveCount(2);
  await expect(page.locator('#status')).toContainText('Analysis complete');
});

test('PDF color checker has no mobile horizontal overflow',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto('/en/pdf/pdf-color-space-checker/');
  await expect(page.locator('h1')).toBeVisible();
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2);
  expect(noOverflow).toBeTruthy();
});
