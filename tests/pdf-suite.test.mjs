import test from'node:test';import assert from'node:assert/strict';import{parsePageRange,pageNumberPosition,cropBox,hexToRgb}from'../assets/js/pdf-suite-core.mjs';
test('page ranges parse and dedupe',()=>assert.deepEqual(parsePageRange('1-3,3,5',6),[0,1,2,4]));
test('empty range means all pages',()=>assert.deepEqual(parsePageRange('',3),[0,1,2]));
test('page number position centers',()=>assert.deepEqual(pageNumberPosition(600,800,'bottom-center',20),{x:300,y:20,align:'center'}));
test('crop box subtracts margins',()=>assert.deepEqual(cropBox(600,800,{left:10,right:20,top:30,bottom:40}),{left:10,bottom:40,right:580,top:770,width:570,height:730}));
test('hex color converts',()=>assert.deepEqual(hexToRgb('#ff0000'),{r:1,g:0,b:0}));
