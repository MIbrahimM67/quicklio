import test from'node:test';
import assert from'node:assert/strict';
import{detectDocumentFromRgba}from'../assets/js/document-crop-core.mjs';

function fixture(w,h,{page=null,bg=35,paper=235}={}){
  const data=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const on=page&&x>=page.x&&x<page.x+page.width&&y>=page.y&&y<page.y+page.height;
    let v=on?paper:bg;
    if(on&&y%18===0&&x>page.x+12&&x<page.x+page.width-12)v=90;
    const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
  }
  return data;
}
test('document crop finds a bright page against dark background',()=>{
  const w=120,h=160,page={x:18,y:10,width:88,height:140};
  const d=detectDocumentFromRgba(fixture(w,h,{page}),w,h,{paddingRatio:.01});
  assert.ok(d);assert.ok(d.x<=page.x);assert.ok(d.y<=page.y);
  assert.ok(d.x+d.width>=page.x+page.width-1);assert.ok(d.y+d.height>=page.y+page.height-1);
  assert.ok(d.confidence>.5);assert.ok(d.removedFraction>.1);
});
test('document crop leaves a uniformly bright full-frame image alone',()=>{
  const w=120,h=160,data=fixture(w,h,{page:{x:0,y:0,width:w,height:h},bg:235,paper:235});
  assert.equal(detectDocumentFromRgba(data,w,h),null);
});
test('document crop rejects a tiny bright object',()=>{
  const w=120,h=160,data=fixture(w,h,{page:{x:50,y:70,width:20,height:20}});
  assert.equal(detectDocumentFromRgba(data,w,h),null);
});
