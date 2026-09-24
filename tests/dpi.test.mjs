import test from'node:test';import assert from'node:assert/strict';import{calculateDpi,maxPrintSize,dpiLabel}from'../assets/js/dpi-core.mjs';
test('6000x4000 at 20x13.333 is about 300 dpi',()=>{const r=calculateDpi(6000,4000,20,13.333333);assert.ok(Math.abs(r.effectiveDpi-300)<.01)});
test('max print at 300 dpi',()=>{const r=maxPrintSize(6000,4000,300);assert.equal(r.widthIn,20);assert.ok(Math.abs(r.heightIn-13.3333)<.001)});
test('DPI labels',()=>assert.equal(dpiLabel(300),'High-quality photo'));
