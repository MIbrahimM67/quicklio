import test from'node:test';
import assert from'node:assert/strict';
import{detectBackgroundColor,removeConnectedBackground,rgbToHex,hexToRgb}from'../assets/js/logo-background-core.mjs';

function makeImage(width,height,fill=[255,255,255,255]){
  const data=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<width*height;i++)data.set(fill,i*4);
  return data;
}
function setPx(data,width,x,y,rgba){data.set(rgba,(y*width+x)*4);}
function alphaAt(data,width,x,y){return data[(y*width+x)*4+3];}

test('detects a white corner background',()=>{
  const data=makeImage(5,5);
  setPx(data,5,2,2,[0,0,0,255]);
  assert.deepEqual(detectBackgroundColor(data,5,5),[255,255,255]);
});

test('removes edge-connected background while preserving enclosed matching white',()=>{
  const w=7,h=7,data=makeImage(w,h,[255,255,255,255]);
  // black 5x5 badge ring enclosing a white center pixel
  for(let y=1;y<=5;y++)for(let x=1;x<=5;x++)setPx(data,w,x,y,[0,0,0,255]);
  setPx(data,w,3,3,[255,255,255,255]);
  const result=removeConnectedBackground({data,width:w,height:h,background:[255,255,255],tolerance:5,softness:0});
  assert.equal(alphaAt(result.data,w,0,0),0,'outer white background should be transparent');
  assert.equal(alphaAt(result.data,w,1,1),255,'black logo should remain opaque');
  assert.equal(alphaAt(result.data,w,3,3),255,'enclosed white detail should remain opaque');
});

test('tolerance removes near-white jpeg-like background',()=>{
  const data=makeImage(3,3,[246,247,244,255]);
  setPx(data,3,1,1,[30,30,30,255]);
  const result=removeConnectedBackground({data,width:3,height:3,background:[255,255,255],tolerance:12,softness:0});
  assert.equal(alphaAt(result.data,3,0,0),0);
  assert.equal(alphaAt(result.data,3,1,1),255);
});

test('hex helpers round trip',()=>{
  assert.equal(rgbToHex([12,34,56]),'#0c2238');
  assert.deepEqual(hexToRgb('#0c2238'),[12,34,56]);
});
