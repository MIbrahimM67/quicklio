import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';

const html=fs.readFileSync('en/images/remove-color-from-image/index.html','utf8');

test('remove-color page targets the validated color-removal cluster on one canonical URL',()=>{
  assert.match(html,/<title>Remove Color From Image – Free Image Color Remover \| Quicklio<\/title>/);
  assert.match(html,/<h1>Remove Color From Image<\/h1>/);
  assert.match(html,/remove a color from an image/i);
  assert.match(html,/image color remover/i);
  assert.match(html,/color remover from image/i);
  assert.match(html,/remove a specific color from an image/i);
  assert.match(html,/How do I remove a specific color from an image\?/i);
  assert.match(html,/How do I make one color transparent\?/i);
  assert.match(html,/rel="canonical" href="https:\/\/quicklio\.app\/en\/images\/remove-color-from-image\/"/);
});
