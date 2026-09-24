import test from'node:test';import assert from'node:assert/strict';import{rotatedCanvasSize,resizeScale,clampCrop}from'../assets/js/image-editor-core.mjs';
test('rotate swaps canvas',()=>assert.deepEqual(rotatedCanvasSize(1200,800,90),{width:800,height:1200}));
test('resize scale returns independent axes',()=>assert.deepEqual(resizeScale(1000,500,500,500),{scaleX:.5,scaleY:1}));
test('crop clamps to canvas bounds',()=>assert.deepEqual(clampCrop(900,400,300,300,1000,500),{x:900,y:400,width:100,height:100}));
