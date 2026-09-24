import test from'node:test';import assert from'node:assert/strict';import{bleedGeometry,coverScale}from'../assets/js/bleed-core.mjs';
test('bleed expands page around trim',()=>{const g=bleedGeometry(360,504,9,18);assert.equal(g.pageWidth,414);assert.equal(g.pageHeight,558);assert.equal(g.marks.length,8)});
test('cover scale fills area',()=>{const r=coverScale(1000,500,400,400);assert.equal(r.height,400);assert.ok(r.width>=400)});
