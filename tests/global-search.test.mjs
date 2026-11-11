import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('category hubs load visible cross-category search',()=>{
  const entry=fs.readFileSync('assets/js/site.mjs','utf8');
  const search=fs.readFileSync('assets/js/global-tool-search.mjs','utf8');
  const styles=fs.readFileSync('assets/css/styles.css','utf8');
  assert.match(entry,/global-tool-search\.mjs/);
  assert.match(search,/\.hub-page main \.tools-section/);
  assert.match(search,/Find any Quicklio tool/);
  assert.match(search,/searchToolCatalog\(catalog,query\)/);
  assert.match(search,/\.popular-section \[data-tool-card\]/);
  assert.match(search,/opportunityTools/);
  assert.match(styles,/\.hub-page \.global-tool-search-field/);
  for(const path of ['en/images/index.html','en/pdf/index.html','en/crafts/index.html']){
    const page=fs.readFileSync(path,'utf8');
    assert.match(page,/class="site-home hub-page"/,path);
    assert.match(page,/class="shell tools-section"/,path);
    assert.match(page,/assets\/js\/site\.mjs/,path);
  }
});
