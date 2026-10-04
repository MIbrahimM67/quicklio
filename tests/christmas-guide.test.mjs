import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
const html=fs.readFileSync('guides/christmas-tree-light-count-chart/index.html','utf8');
const text=html=>html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim();
test('Christmas light count guide is substantial and indexable',()=>{assert.match(html,/Christmas tree light count chart/i);assert.match(html,/Christmas light wattage/i);assert.match(html,/rel="canonical" href="https:\/\/quicklio\.app\/guides\/christmas-tree-light-count-chart\/"/);assert.match(html,/"@type":"Article"/);assert.ok(text(html).split(/\s+/).filter(Boolean).length>=800);assert.doesNotMatch(html,/noindex/i)});
test('Christmas guide is in sitemap',()=>{const sitemap=fs.readFileSync('sitemap.xml','utf8');assert.ok(sitemap.includes('https://quicklio.app/guides/christmas-tree-light-count-chart/'))});
