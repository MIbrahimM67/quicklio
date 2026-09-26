import{test,expect}from'@playwright/test';
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#eee"/><circle cx="300" cy="300" r="180" fill="#333"/></svg>');
test('exact KB tool validates upload requirements without modifying image',async({page})=>{
  await page.goto('/en/images/resize-image-to-exact-kb/');
  await page.locator('#workflowMode').selectOption('validate');
  await page.locator('#fileInput').setInputFiles({name:'photo.svg',mimeType:'image/svg+xml',buffer:svg});
  await page.locator('#validatorMinKb').fill('0.1');
  await page.locator('#validatorMaxKb').fill('200');
  await page.locator('#validatorWidthMode').selectOption('exact');
  await page.locator('#validatorWidth').fill('600');
  await page.locator('#validatorHeightMode').selectOption('exact');
  await page.locator('#validatorHeight').fill('600');
  await page.locator('.validatorFormat').evaluateAll(nodes=>nodes.forEach(n=>n.checked=true));
  await page.locator('#checkRequirementsBtn').click();
  await expect(page.locator('#requirementsResult')).toBeVisible();
  await expect(page.locator('#requirementsResult')).toContainText('Passes all selected requirements');
  await expect(page.locator('#requirementsResult')).toContainText('600 px');
});
