import {test,expect} from '@playwright/test';

for(const route of ['/','/en/images/','/en/pdf/','/en/images/online-image-editor/']){
  test(`header search finds tools from ${route}`,async({page})=>{
    await page.setViewportSize({width:1600,height:850});
    await page.goto(route);
    const search=page.locator('.header-search-input');
    await expect(search).toBeVisible();
    await search.fill('image');
    await expect(page.locator('.header-search-status')).toContainText('matching tools');
    await expect(page.locator('.header-search-result[href="/en/pdf/image-to-pdf/"]')).toBeVisible();
    await search.fill('passport photo');
    await expect(page.locator('.header-search-result').first()).toContainText('Passport');
  });
}

test('mobile header search icon opens compact input',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/en/images/');
  const toggle=page.locator('.header-search-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  const search=page.locator('.header-search-input');
  await expect(search).toBeVisible();
  await search.fill('barcode');
  await expect(page.locator('.header-search-result[href="/en/labels/barcode-label-sheet-generator/"]')).toBeVisible();
  await search.fill('');
  await search.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded','false');
});
