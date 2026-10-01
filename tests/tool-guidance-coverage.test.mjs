import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';

const sitemap=fs.readFileSync('sitemap.xml','utf8');
const paths=[...sitemap.matchAll(/<loc>https:\/\/quicklio\.app(\/en\/[^<]+)<\/loc>/g)]
  .map(m=>m[1])
  .filter(path=>/^\/en\/[^/]+\/[^/]+\/$/.test(path));

test('all sitemap tool pages use the shared site loader',()=>{
  assert.ok(paths.length>=30,'expected at least 30 tool pages');
  for(const path of paths){
    const file=path.replace(/^\//,'')+'index.html';
    assert.ok(fs.existsSync(file),file+' missing');
    const html=fs.readFileSync(file,'utf8');
    assert.match(html,/class="[^"]*tool-page/,'tool-page class missing: '+file);
    assert.match(html,/\/assets\/js\/site\.mjs/,'shared site loader missing: '+file);
    assert.match(html,/<h1[^>]*>[^<]+<\/h1>/,'H1 missing: '+file);
    assert.match(html,/rel="canonical"/,'canonical missing: '+file);
  }
});

test('guided flow assets exist',()=>{
  assert.ok(fs.existsSync('assets/js/tool-flow.mjs'));
  assert.ok(fs.existsSync('assets/css/tool-flow.css'));
});
