import{test,expect}from'@playwright/test';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlJcAAAAASUVORK5CYII=','base64');
test('exact KB tool validates upload requirements without modifying image',async({page})=>{
  await page.goto('/en/images/resize-image-to-exact-kb/');
  await page.locator('#workflowMode').selectOption('validate');
  await page.locator('#fileInput').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:png});
  await page.locator('#validatorMinKb').fill('0.01');
  await page.locator('#validatorMaxKb').fill('200');
  await page.locator('#validatorWidthMode').selectOption('exact');
  await page.locator('#validatorWidth').fill('1');
  await page.locator('#validatorHeightMode').selectOption('exact');
  await page.locator('#validatorHeight').fill('1');
  await page.locator('#checkRequirementsBtn').click();
  await expect(page.locator('#requirementsResult')).toBeVisible();
  await expect(page.locator('#requirementsResult')).toContainText('Passes all selected requirements');
  await expect(page.locator('#requirementsResult')).toContainText('1 px');
});
