import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
const seasonal=fs.readFileSync('assets/js/seasonal-opportunity.mjs','utf8');
const site=fs.readFileSync('assets/js/site.mjs','utf8');
const llms=fs.readFileSync('llms.txt','utf8');
test('shared runtime loads seasonal opportunity enhancements',()=>{assert.match(site,/seasonal-opportunity\.mjs/);assert.match(seasonal,/Christmas tree light count chart/);assert.match(seasonal,/Christmas light wattage calculator/);assert.match(seasonal,/Easy to carve/);assert.match(seasonal,/Advanced Stencil Maker/)});
test('seasonal opportunity code targets the canonical tool paths only',()=>{assert.match(seasonal,/\/en\/christmas\/christmas-lights-calculator\//);assert.match(seasonal,/\/en\/halloween\/pumpkin-stencil-maker\//)});
test('llms.txt describes Quicklio and links canonical resources',()=>{assert.match(llms,/^# Quicklio/m);for(const url of['https://quicklio.app/','https://quicklio.app/guides/','https://quicklio.app/en/crafts/stencil-maker/','https://quicklio.app/en/christmas/christmas-lights-calculator/'])assert.ok(llms.includes(url),url)});
