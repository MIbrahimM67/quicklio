import{test,expect}from'@playwright/test';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8Dwn4Hh/38AD/kD/Wj/froAAAAASUVORK5CYII=','base64');

async function prepareResult(page){
  await page.locator('#fileInput').setInputFiles({name:'red-blue.png',mimeType:'image/png',buffer:png});
  await expect(page.locator('#fileMeta')).toContainText('2 × 1px');
  await page.locator('#targetColor').evaluate(el=>{el.value='#ff0000';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#tolerance').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#softness').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#removeBtn').click();
  await expect(page.locator('#resultPanel')).toBeVisible();
}

async function trackedEvents(page){
  return page.evaluate(()=>window.dataLayer.map(item=>Array.from(item)).filter(item=>item[0]==='event').map(item=>item[1]));
}

test('remove color tool makes selected color transparent and downloads PNG',async({page})=>{
  await page.goto('/en/images/remove-color-from-image/');
  await expect(page.locator('h1')).toHaveText('Remove Color From Image');
  await prepareResult(page);
  await expect(page.locator('#resultMeta')).toContainText('50% affected');
  const alphas=await page.locator('#resultCanvas').evaluate(canvas=>{const d=canvas.getContext('2d').getImageData(0,0,2,1).data;return[d[3],d[7]];});
  expect(alphas).toEqual([0,255]);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#downloadBtn').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('red-blue-color-removed.png');
  await expect(page.locator('#status')).toContainText('Download started');
  await expect(page.locator('#downloadBtn')).toBeEnabled();
});

test('remove color tool records each export funnel stage',async({page})=>{
  await page.goto('/en/images/remove-color-from-image/');
  await page.locator('[data-analytics-accept]').click();
  await prepareResult(page);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#downloadBtn').click();
  await downloadPromise;
  await expect.poll(()=>trackedEvents(page)).toEqual(expect.arrayContaining([
    'remove_color_file_loaded',
    'remove_color_processing_started',
    'remove_color_result_ready',
    'remove_color_download_requested',
    'remove_color_download_ready',
    'remove_color_download_dispatched',
    'download_clicked'
  ]));
});

test('remove color tool reports PNG export failures instead of failing silently',async({page})=>{
  await page.goto('/en/images/remove-color-from-image/');
  await page.locator('[data-analytics-accept]').click();
  await prepareResult(page);
  await page.locator('#resultCanvas').evaluate(canvas=>{canvas.toBlob=callback=>callback(null);});
  await page.locator('#downloadBtn').click();
  await expect(page.locator('#status')).toContainText('could not prepare the PNG');
  await expect(page.locator('#downloadBtn')).toBeEnabled();
  await expect.poll(()=>trackedEvents(page)).toEqual(expect.arrayContaining(['remove_color_download_requested','remove_color_download_failed']));
});

test('remove color guide follows upload settings run review sequence',async({page})=>{
  await page.goto('/en/images/remove-color-from-image/');
  const guide=page.locator('[data-tool-flow-guide]');
  await expect(guide.locator('[data-flow-step]')).toHaveCount(4);
  await expect(guide.locator('[data-flow-step="start"]')).toContainText('Add your image');
  await expect(guide.locator('[data-flow-step="settings"]')).toContainText('Choose your settings');
  await expect(guide.locator('[data-flow-step="run"]')).toContainText('Run the tool');
  await expect(guide.locator('[data-flow-step="result"]')).toContainText('Review your result');
  await expect(guide).toContainText('Tolerance');
  await expect(guide).toContainText('Edge softness');

  await page.locator('#fileInput').setInputFiles({name:'red-blue.png',mimeType:'image/png',buffer:png});
  await expect(guide.locator('[data-flow-step="settings"]')).toHaveClass(/is-current/);
  await page.locator('#targetColor').evaluate(el=>{el.value='#ff0000';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(guide.locator('[data-flow-step="run"]')).toHaveClass(/is-current/);
  await page.locator('#removeBtn').click();
  await expect(guide.locator('[data-tool-flow-progress]')).toHaveText('Complete');
  await expect(guide.locator('[data-tool-flow-result-note]')).toBeVisible();
  await expect(guide).toContainText('Result ready');
});

test('remove color tool uses the desktop editor width',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/en/images/remove-color-from-image/');
  const workbench=await page.locator('.tool-workbench').boundingBox();
  const editor=await page.locator('.color-tool-grid>.color-card').first().boundingBox();
  const controls=await page.locator('.color-controls').boundingBox();
  expect(workbench?.width).toBeGreaterThan(1000);
  expect(editor?.width).toBeGreaterThan(650);
  expect(controls?.x).toBeGreaterThan((editor?.x??0)+(editor?.width??0));
});

test('remove color tool fits mobile width',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto('/en/images/remove-color-from-image/');
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2);
  expect(noOverflow).toBe(true);
});
