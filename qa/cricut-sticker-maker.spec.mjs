import{test,expect}from'@playwright/test';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP4z8Dwn4GBgYGJAQoAHgQCAf3xYpcAAAAASUVORK5CYII=','base64');
const upload={name:'sticker.png',mimeType:'image/png',buffer:png};

test('Cricut Sticker Maker processes an image and plans a sheet',async({page})=>{
  await page.goto('/en/crafts/cricut-sticker-maker/');
  await page.locator('#fileInput').setInputFiles(upload);
  await expect(page.locator('#resultPanel')).toBeVisible();
  await expect(page.locator('#downloadPng')).toBeEnabled();
  await expect(page.locator('#downloadSheetPreview')).toBeEnabled();
  await expect(page.locator('#fitPerSheet')).not.toHaveText('—');
  const sticker=await page.locator('#resultCanvas').evaluate(c=>[c.width,c.height]);
  const sheet=await page.locator('#sheetCanvas').evaluate(c=>[c.width,c.height]);
  expect(sticker[0]).toBeGreaterThan(1);expect(sticker[1]).toBeGreaterThan(1);
  expect(sheet[0]).toBeGreaterThan(1);expect(sheet[1]).toBeGreaterThan(1);
  await expect(page.getByText('Quicklio does not add Cricut registration/sensor marks.')).toBeVisible();
});
