import test from'node:test';import assert from'node:assert/strict';import{movePage,normalizeRotation,rotatePageState,rotatedPageSize,hasPageEdits}from'../assets/js/pdf-editor-core.mjs';
test('move page reorders without mutating input',()=>{const a=[1,2,3],b=movePage(a,2,0);assert.deepEqual(b,[3,1,2]);assert.deepEqual(a,[1,2,3])});
test('rotation normalizes',()=>assert.equal(normalizeRotation(450),90));
test('rotate state increments',()=>assert.equal(rotatePageState({rotation:270},90).rotation,0));
test('rotated size swaps at 90',()=>assert.deepEqual(rotatedPageSize(612,792,90),{width:792,height:612}));
test('page edits include annotations or rotation',()=>{assert.equal(hasPageEdits({annotations:[],rotation:0}),false);assert.equal(hasPageEdits({annotations:[{}],rotation:0}),true);assert.equal(hasPageEdits({annotations:[],rotation:90}),true)});
