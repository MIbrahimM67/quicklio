import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('shared Quicklio entry point mounts header search and uses ranked catalog',()=>{
  const entry=fs.readFileSync('assets/js/site.mjs','utf8');
  const js=fs.readFileSync('assets/js/header-search.mjs','utf8');
  const css=fs.readFileSync('assets/css/styles.css','utf8');
  assert.match(entry,/header-search\.mjs/);
  assert.match(js,/\.site-header \.header-inner/);
  assert.match(js,/searchToolCatalog\(catalog,input\.value\.trim\(\)\)/);
  assert.match(js,/header-search-toggle/);
  assert.match(js,/header-search-input/);
  assert.match(js,/opportunityTools/);
  assert.match(css,/\.site-header \.header-search-form/);
  assert.match(css,/@media \(min-width:88rem\)/);
  for(const route of ['index.html','en/images/index.html','en/pdf/index.html','en/crafts/index.html','en/images/online-image-editor/index.html']){
    assert.match(fs.readFileSync(route,'utf8'),/assets\/js\/site\.mjs/,route);
  }
});
