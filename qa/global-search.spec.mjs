import {test,expect} from '@playwright/test';

for(const route of ['/en/images/','/en/pdf/','/en/crafts/']){
  test(`global search is visible and finds tools across categories on ${route}`,async({page})=>{
    await page.goto(route);
    const search=page.locator('#global-tool-query');
    await expect(search).toBeVisible();
    await search.fill('image');
    await expect(page.locator('.global-tool-search-status')).toContainText('matching tools across Quicklio');
    await expect(page.locator('.global-tool-search-result[href="/en/images/online-image-editor/"]')).toBeVisible();
    await expect(page.locator('.global-tool-search-result[href="/en/pdf/image-to-pdf/"]')).toBeVisible();
    await search.fill('passport photo');
    await expect(page.locator('.global-tool-search-result').first()).toContainText('Passport');
    await search.fill('');
    await expect(page.locator('.tools-section > .tool-card-grid')).toBeVisible();
  });
}
