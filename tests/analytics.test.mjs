import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import path from'node:path';

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(['.git','node_modules','playwright-report','test-results'].includes(entry.name))return[];
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}
const htmlFiles=walk('.').filter(p=>p.endsWith('index.html'));
const siteJs=fs.readFileSync('assets/js/site.mjs','utf8');
const privacy=fs.readFileSync('privacy/index.html','utf8');

test('GA4 uses the Quicklio measurement ID',()=>{
  assert.match(siteJs,/G-72360H1LTV/);
  assert.match(siteJs,/googletagmanager\.com\/gtag\/js/);
});

test('analytics is consent-gated with ads disabled',()=>{
  assert.match(siteJs,/analytics_storage:'denied'/);
  assert.match(siteJs,/ad_storage:'denied'/);
  assert.match(siteJs,/ad_user_data:'denied'/);
  assert.match(siteJs,/ad_personalization:'denied'/);
  assert.match(siteJs,/analytics_storage:'granted'/);
  assert.match(siteJs,/Accept analytics/);
  assert.match(siteJs,/Privacy choices/);
});

test('all public HTML pages load the shared site script',()=>{
  for(const file of htmlFiles){
    const html=fs.readFileSync(file,'utf8');
    assert.match(html,/src="\/assets\/js\/site\.mjs"/,file+' does not load the shared site script');
  }
});

test('privacy page discloses Analytics consent',()=>{
  assert.match(privacy,/Analytics and consent/);
  assert.match(privacy,/Google Analytics 4/);
  assert.match(privacy,/Privacy choices/);
});


test('usage analytics events are defined and consent-gated',()=>{
  for(const name of['tool_started','tool_completed','download_clicked','site_search_used','related_tool_clicked']){
    assert.match(siteJs,new RegExp(name));
  }
  assert.match(siteJs,/function quicklioTrack/);
  assert.match(siteJs,/quicklioAnalyticsEnabled/);
  assert.match(siteJs,/query_length/);
  assert.doesNotMatch(siteJs,/search_term\s*:/);
});

test('tool analytics includes stable tool dimensions',()=>{
  assert.match(siteJs,/tool_name/);
  assert.match(siteJs,/tool_category/);
  assert.match(siteJs,/tool_path/);
  assert.match(siteJs,/completion_method/);
  assert.match(siteJs,/file_extension/);
});
