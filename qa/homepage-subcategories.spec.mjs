import{test,expect}from'@playwright/test';

test('homepage groups every tool into task-oriented subcategories',async({page})=>{
  await page.goto('/');
  const groups=page.locator('[data-tool-group]');
  await expect(groups).toHaveCount(7);
  await expect(page.locator('[data-tool-card]')).toHaveCount(33);
  await expect(page.locator('[data-tool-group="pdf-essentials"] .tool-subcategory-title strong')).toHaveText('PDF Essentials');
  await expect(page.locator('[data-tool-group="print-prepress"] .tool-subcategory-title strong')).toHaveText('Print & Prepress');
  await expect(page.locator('[data-tool-group="images-photos"] .tool-subcategory-title strong')).toHaveText('Images & Photos');
  await expect(page.locator('[data-tool-group="crafts-makers"] .tool-subcategory-title strong')).toHaveText('Crafts & Makers');
  await expect(page.locator('[data-tool-group-jump]')).toHaveCount(7);
  for(const group of await groups.all())await expect(group.locator('[data-tool-card]').first()).toBeVisible();
});

test('homepage category filters hide empty subcategory sections and keep matching tools',async({page})=>{
  await page.goto('/');
  await page.locator('[data-tool-filter="image"]').click();
  await expect(page.locator('[data-tool-card]:visible')).toHaveCount(7);
  await expect(page.locator('[data-tool-group="images-photos"]')).toBeVisible();
  await expect(page.locator('[data-tool-group="pdf-essentials"]')).toBeHidden();
  await expect(page.locator('[data-tool-group-jump]:visible')).toHaveCount(1);
});

test('homepage search keeps only subcategories that contain matching cards',async({page})=>{
  await page.goto('/');
  await page.locator('[data-tool-search]').fill('Cricut');
  await expect(page.locator('[data-tool-card]:visible')).toHaveCount(2);
  await expect(page.locator('[data-tool-group="crafts-makers"]')).toBeVisible();
  await expect(page.locator('[data-tool-group="images-photos"]')).toBeHidden();
  await expect(page.locator('[data-tools-empty]')).toBeHidden();
});
