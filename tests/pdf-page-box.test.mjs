import test from"node:test";
import assert from"node:assert/strict";
import{toPoints,fromPoints,boxFromEdges,insetBox,expandBox,containsBox,validateBoxes,boxesAlmostEqual}from"../assets/js/pdf-page-box-core.mjs";

test("page-box units round trip",()=>{
  assert.ok(Math.abs(toPoints(25.4,"mm")-72)<1e-9);
  assert.ok(Math.abs(fromPoints(72,"mm")-25.4)<1e-9);
  assert.equal(toPoints(2,"in"),144);
});
test("page-box inset and bleed expansion",()=>{
  const media=boxFromEdges({left:0,bottom:0,right:600,top:800});
  const trim=insetBox(media,20);
  assert.deepEqual(trim,{left:20,bottom:20,right:580,top:780,width:560,height:760});
  const bleed=expandBox(trim,10);
  assert.deepEqual(bleed,{left:10,bottom:10,right:590,top:790,width:580,height:780});
  assert.equal(containsBox(media,bleed),true);
  assert.equal(containsBox(bleed,trim),true);
});
test("page-box validation catches outside media and trim bleed mismatch",()=>{
  const boxes={
    MediaBox:boxFromEdges({left:0,bottom:0,right:600,top:800}),
    CropBox:boxFromEdges({left:0,bottom:0,right:600,top:800}),
    BleedBox:boxFromEdges({left:20,bottom:20,right:580,top:780}),
    TrimBox:boxFromEdges({left:10,bottom:10,right:590,top:790}),
    ArtBox:boxFromEdges({left:-1,bottom:0,right:500,top:700})
  };
  const issues=validateBoxes(boxes);
  assert.ok(issues.includes("ArtBox extends outside MediaBox."));
  assert.ok(issues.includes("TrimBox is not fully inside BleedBox."));
});
test("page-box comparison tolerates PDF float noise",()=>{
  assert.equal(boxesAlmostEqual(
    {x:10,y:20,width:300,height:400},
    {left:10.02,bottom:19.99,right:310.02,top:420.01}
  ),true);
});
