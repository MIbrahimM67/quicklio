import test from'node:test';
import assert from'node:assert/strict';
import{removeSelectedColor,hexToRgb,rgbToHex,colorDistance}from'../assets/js/remove-color-core.mjs';

test('removes the selected color wherever it appears',()=>{
  const data=new Uint8ClampedArray([
    255,0,0,255, 0,0,255,255,
    255,0,0,255, 0,255,0,255
  ]);
  const result=removeSelectedColor({data,width:2,height:2,target:[255,0,0],tolerance:0,softness:0});
  assert.equal(result.data[3],0);
  assert.equal(result.data[11],0);
  assert.equal(result.data[7],255);
  assert.equal(result.data[15],255);
  assert.equal(result.fullyTransparentPixels,2);
});

test('tolerance includes nearby shades but leaves distant colors',()=>{
  const data=new Uint8ClampedArray([250,8,5,255,210,40,40,255,0,0,255,255]);
  const tight=removeSelectedColor({data,width:3,height:1,target:[255,0,0],tolerance:2,softness:0});
  assert.equal(tight.data[3],255);
  const broad=removeSelectedColor({data,width:3,height:1,target:[255,0,0],tolerance:25,softness:0});
  assert.equal(broad.data[3],0);
  assert.equal(broad.data[7],0);
  assert.equal(broad.data[11],255);
});

test('edge softness creates partial alpha for near matches',()=>{
  const data=new Uint8ClampedArray([255,0,0,255,225,25,25,255]);
  const result=removeSelectedColor({data,width:2,height:1,target:[255,0,0],tolerance:12,softness:20});
  assert.equal(result.data[3],0);
  assert.ok(result.data[7]>0&&result.data[7]<255);
});

test('pre-existing transparency is preserved',()=>{
  const data=new Uint8ClampedArray([255,0,0,0,255,0,0,128]);
  const result=removeSelectedColor({data,width:2,height:1,target:[255,0,0],tolerance:0,softness:0});
  assert.equal(result.data[3],0);
  assert.equal(result.data[7],0);
});

test('hex and distance helpers are stable',()=>{
  assert.deepEqual(hexToRgb('#12abef'),[18,171,239]);
  assert.equal(rgbToHex([18,171,239]),'#12abef');
  assert.equal(colorDistance([1,2,3],[1,2,3]),0);
});
