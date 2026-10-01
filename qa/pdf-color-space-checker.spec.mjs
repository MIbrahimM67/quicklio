import{test,expect}from'@playwright/test';

test('PDF color checker is safely quarantined',async({page})=>{
  await page.goto('/en/pdf/pdf-color-space-checker/');
  await expect(page.locator('h1')).toHaveText('PDF Color Space Checker');
  await expect(page.locator('#drop')).toContainText('Checker temporarily unavailable');
  await expect(page.locator('#pdfInput')).toBeDisabled();
  await expect(page.locator('#status')).toContainText('Temporarily disabled');
  await expect(page.locator('#results')).toBeHidden();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
});

test('PDF color checker quarantine has no mobile horizontal overflow',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto('/en/pdf/pdf-color-space-checker/');
  await expect(page.locator('h1')).toBeVisible();
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2);
  expect(noOverflow).toBeTruthy();
});
