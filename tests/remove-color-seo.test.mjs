import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';

const html=fs.readFileSync('en/images/remove-color-from-image/index.html','utf8');

test('remove-color page targets the specific-color job on one canonical URL',()=>{
  assert.match(html,/<title>Remove Specific Color From Image Online \| Quicklio<\/title>/);
  assert.match(html,/<h1>Remove Specific Color From Image<\/h1>/);
  assert.match(html,/remove one color from an image/i);
  assert.match(html,/make matching pixels transparent/i);
  assert.match(html,/How do I remove a specific color from an image\?/i);
  assert.match(html,/How do I make one color transparent\?/i);
  assert.match(html,/rel="canonical" href="https:\/\/quicklio\.app\/en\/images\/remove-color-from-image\/"/);
});
