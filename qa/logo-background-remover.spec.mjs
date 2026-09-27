import{test,expect}from'@playwright/test';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAKElEQVR4nG2LMQoAMAyEvJL/f9lODSHUUTSqLAogSQuVsyvgL+stkwuOwwoHh8Yn7AAAAABJRU5ErkJggg==','base64');

test('logo background remover makes edge background transparent and keeps logo',async({page})=>{
  await page.goto('/en/images/remove-background-from-logo/');
  await expect(page.locator('h1')).toHaveText('Remove Background from Logo');
  await page.locator('#fileInput').setInputFiles({name:'badge.png',mimeType:'image/png',buffer:png});
  await expect(page.locator('#fileMeta')).toContainText('5 × 5px');
  await page.locator('#softness').fill('0');
  await page.locator('#tolerance').fill('5');
  await page.locator('#removeBtn').click();
  await expect(page.locator('#resultPanel')).toBeVisible();
  await expect(page.locator('#downloadBtn')).toBeEnabled();
  const alpha=await page.locator('#resultCanvas').evaluate(canvas=>{
    const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    return{corner:d[3],center:d[((2*canvas.width+2)*4)+3]};
  });
  expect(alpha.corner).toBe(0);
  expect(alpha.center).toBe(255);
});

test('logo background remover has no horizontal overflow on mobile',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto('/en/images/remove-background-from-logo/');
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2);
  expect(noOverflow).toBeTruthy();
});
