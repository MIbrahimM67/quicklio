import{test,expect}from'@playwright/test';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8Dwn4Hh/38AD/kD/Wj/froAAAAASUVORK5CYII=','base64');

test('remove color tool makes selected color transparent and downloads PNG',async({page})=>{
  await page.goto('/en/images/remove-color-from-image/');
  await expect(page.locator('h1')).toHaveText('Remove Color From Image');
  await page.locator('#fileInput').setInputFiles({name:'red-blue.png',mimeType:'image/png',buffer:png});
  await expect(page.locator('#fileMeta')).toContainText('2 × 1px');
  await page.locator('#targetColor').evaluate(el=>{el.value='#ff0000';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#tolerance').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#softness').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#removeBtn').click();
  await expect(page.locator('#resultPanel')).toBeVisible();
  await expect(page.locator('#resultMeta')).toContainText('50% affected');
  const alphas=await page.locator('#resultCanvas').evaluate(canvas=>{const d=canvas.getContext('2d').getImageData(0,0,2,1).data;return[d[3],d[7]];});
  expect(alphas).toEqual([0,255]);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#downloadBtn').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('red-blue-color-removed.png');
});

test('remove color tool fits mobile width',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto('/en/images/remove-color-from-image/');
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2);
  expect(noOverflow).toBe(true);
});
