import test from'node:test';
import assert from'node:assert/strict';
import{getPlanningArea,stickerPhysicalSize,planStickerLayout}from'../assets/js/sticker-maker-core.mjs';

test('uses a conservative inset planning area',()=>{
  const area=getPlanningArea('letter');
  assert.ok(Math.abs(area.width-6.82)<.001);
  assert.ok(Math.abs(area.height-9.32)<.001);
});

test('finished sticker size includes border while preserving artwork aspect',()=>{
  const size=stickerPhysicalSize({sourceWidth:1000,sourceHeight:500,finishedWidthIn:3,borderIn:.1});
  assert.equal(size.finishedWidthIn,3);
  assert.ok(Math.abs(size.contentWidthIn-2.8)<1e-9);
  assert.ok(Math.abs(size.finishedHeightIn-1.6)<1e-9);
});

test('rotation can fit more stickers on a letter planning area',()=>{
  const plan=planStickerLayout({paper:'letter',stickerWidthIn:3,stickerHeightIn:2,gapIn:.125,copies:20,allowRotate:true});
  assert.equal(plan.mode,'Rotated');
  assert.equal(plan.perSheet,9);
  assert.equal(plan.sheets,3);
  assert.equal(plan.positions.length,9);
});

test('disabling rotation keeps the standard orientation',()=>{
  const plan=planStickerLayout({paper:'letter',stickerWidthIn:3,stickerHeightIn:2,gapIn:.125,copies:8,allowRotate:false});
  assert.equal(plan.mode,'Standard');
  assert.equal(plan.perSheet,8);
  assert.equal(plan.sheets,1);
});

test('rejects stickers that do not fit the planning area',()=>{
  assert.throws(()=>planStickerLayout({paper:'letter',stickerWidthIn:8,stickerHeightIn:8,copies:1}),/does not fit/i);
});
