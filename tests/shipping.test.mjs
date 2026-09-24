import test from'node:test';import assert from'node:assert/strict';import{cropRegion,fitShipping}from'../assets/js/shipping-core.mjs';
test('top half crop returns half page',()=>{const r=cropRegion(612,792,'top');assert.equal(r.width,612);assert.equal(r.height,396);assert.equal(r.top,792);assert.equal(r.bottom,396)});
test('shipping fit stays inside 4x6',()=>{const r=fitShipping(612,396,'portrait',6);assert.ok(r.width<=276);assert.ok(r.height<=420)});
