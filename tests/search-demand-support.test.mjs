import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';

const site=fs.readFileSync('assets/js/site.mjs','utf8');
const demand=fs.readFileSync('assets/js/search-demand-support.mjs','utf8');
const discovery=fs.readFileSync('assets/js/indexing-discovery.mjs','utf8');

test('shared runtime loads search-demand support',()=>{
  assert.match(site,/search-demand-support\.mjs/);
});

test('Christmas demand support targets observed tree-light queries responsibly',()=>{
  assert.match(demand,/christmas-lights-calculator/);
  assert.match(demand,/Christmas tree light count chart/);
  assert.match(demand,/100 mini lights per vertical foot/);
  assert.match(demand,/100 lights per 1 to 1\.5 feet/);
  assert.match(demand,/planning estimates, not electrical-load limits/);
  assert.match(demand,/homedepot\.com/);
  assert.match(demand,/lowes\.com/);
});

test('Halloween demand support explains the calculator formula',()=>{
  assert.match(demand,/halloween-candy-calculator/);
  assert.match(demand,/How much Halloween candy should I buy\?/);
  assert.match(demand,/visitors × pieces each × \(1 \+ buffer\)/);
  assert.match(demand,/150 expected visitors/);
});

test('seasonal pages cross-link contextually',()=>{
  assert.match(discovery,/halloween-candy-calculator/);
  assert.match(discovery,/pumpkin-stencil-maker/);
});
