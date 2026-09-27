import{test,expect}from"@playwright/test";
import{PDFDocument}from"pdf-lib";
import{readFile}from"node:fs/promises";

async function samplePdf(){
  const doc=await PDFDocument.create();
  const p=doc.addPage([600,800]);
  p.setCropBox(0,0,600,800);
  return Buffer.from(await doc.save());
}

test("PDF page box editor writes and verifies TrimBox",async({page})=>{
  await page.goto("/en/pdf/pdf-page-box-editor/");
  await expect(page.locator("h1")).toHaveText("PDF Page Box Editor");
  await page.locator("#pdfInput").setInputFiles({name:"print.pdf",mimeType:"application/pdf",buffer:await samplePdf()});
  await expect(page.locator("#workspace")).toBeVisible();
  await expect(page.locator('[data-explicit="TrimBox"]')).toContainText("default");
  await page.locator("#unit").selectOption("pt");
  await page.locator('[data-box="TrimBox"][data-edge="left"]').fill("20");
  await page.locator('[data-box="TrimBox"][data-edge="bottom"]').fill("30");
  await page.locator('[data-box="TrimBox"][data-edge="right"]').fill("580");
  await page.locator('[data-box="TrimBox"][data-edge="top"]').fill("770");
  const downloadPromise=page.waitForEvent("download");
  await page.locator("#processBtn").click();
  const download=await downloadPromise;
  const path=await download.path();
  const out=await PDFDocument.load(await readFile(path));
  const box=out.getPage(0).getTrimBox();
  expect(box.x).toBeCloseTo(20,3);
  expect(box.y).toBeCloseTo(30,3);
  expect(box.width).toBeCloseTo(560,3);
  expect(box.height).toBeCloseTo(740,3);
  await expect(page.locator("#status")).toContainText("Verified and downloaded");
});

test("PDF page box editor has no horizontal overflow on mobile",async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto("/en/pdf/pdf-page-box-editor/");
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2);
  expect(noOverflow).toBeTruthy();
});
