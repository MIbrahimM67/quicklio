import test from'node:test';import assert from'node:assert/strict';
import{thresholdMaskFromRgba,findEnclosedHoles,addBridges,traceMaskToPath,buildStencilSvg}from'../assets/js/stencil-core.mjs';
import{setPngDpi,readPngDpi,setJpegDpi,readJpegDpi}from'../assets/js/dpi-metadata-core.mjs';
import{estimatePaperColor,removePaperBackground,transparentBounds}from'../assets/js/signature-background-core.mjs';
import{fitPatternGrid,quantizeColors,finishedSizeInches}from'../assets/js/cross-stitch-core.mjs';

test('stencil threshold makes dark pixels cut areas',()=>{const d=new Uint8ClampedArray([0,0,0,255,255,255,255,255]);assert.deepEqual([...thresholdMaskFromRgba(d,2,1,{threshold:128})],[1,0])});
test('stencil detects and bridges enclosed holes',()=>{const m=new Uint8Array([0,0,0,0,0,0,1,1,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,0,0]);assert.equal(findEnclosedHoles(m,5,5).length,1);const b=addBridges(m,5,5,{bridgeWidth:1,minHoleArea:1});assert.equal(b.bridged,1);assert.equal(findEnclosedHoles(b.mask,5,5).length,0)});
test('stencil traces a filled block into a closed SVG path',()=>{const m=new Uint8Array([1,1,1,1]);const d=traceMaskToPath(m,2,2);assert.match(d,/^M/);assert.match(d,/Z$/);assert.match(buildStencilSvg(m,2,2),/<path/)});
test('PNG DPI metadata can be inserted and read',()=>{const sig=[137,80,78,71,13,10,26,10];const ihdr=new Uint8Array(25);ihdr.set([0,0,0,13,73,72,68,82],0);const iend=new Uint8Array([0,0,0,0,73,69,78,68,174,66,96,130]);const png=new Uint8Array(sig.length+ihdr.length+iend.length);png.set(sig);png.set(ihdr,8);png.set(iend,33);const out=setPngDpi(png,300);const dpi=readPngDpi(out);assert.ok(Math.abs(dpi.x-300)<.1)});
test('JPEG DPI metadata can be inserted and read',()=>{const jpg=new Uint8Array([0xff,0xd8,0xff,0xd9]);const out=setJpegDpi(jpg,300);assert.equal(Math.round(readJpegDpi(out).x),300)});
test('paper color estimator sees white edge',()=>{const d=new Uint8ClampedArray(3*3*4);for(let i=0;i<d.length;i+=4){d[i]=d[i+1]=d[i+2]=250;d[i+3]=255}d[16]=d[17]=d[18]=0;assert.deepEqual(estimatePaperColor(d,3,3),[250,250,250]);const r=removePaperBackground({data:d,width:3,height:3,tolerance:10,softness:5});assert.equal(r.data[3],0);assert.equal(r.data[19],255);assert.deepEqual(transparentBounds(r.data,3,3),{x:1,y:1,width:1,height:1})});
test('cross stitch grid preserves ratio and quantizes',()=>{assert.deepEqual(fitPatternGrid(200,100,40),{width:40,height:20});const q=quantizeColors([[0,0,0],[2,2,2],[250,250,250],[255,255,255]],2);assert.equal(q.palette.length,2);assert.deepEqual(finishedSizeInches(70,35,14),{width:5,height:2.5})});
