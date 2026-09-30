import test from'node:test';
import assert from'node:assert/strict';
import{ocrBlocksToPositionedParagraphs,clearOcrTextFromCanvas}from'../assets/js/pdf-to-word-ocr.mjs';

test('OCR blocks map canvas coordinates into positioned Word paragraphs',()=>{
  const blocks=[{paragraphs:[{is_ltr:true,lines:[{text:'Scanned heading',bbox:{x0:100,y0:200,x1:500,y1:260},baseline:{x0:100,y0:250,x1:500,y1:250},words:[{text:'Scanned',bbox:{x0:100,y0:200,x1:280,y1:260},font_name:'Arial-Bold'},{text:'heading',bbox:{x0:300,y0:200,x1:500,y1:260},font_name:'Arial'}]}]}]}];
  const result=ocrBlocksToPositionedParagraphs(blocks,1000,1500,500,750);assert.equal(result.paragraphs.length,1);const p=result.paragraphs[0];
  assert.equal(p.text,'Scanned heading');assert.equal(p.layoutXPt,50);assert.equal(p.layoutWidthPt,200);assert.equal(p.layoutFirstBaselinePt,625);assert.equal(p.ocrPositioned,true);assert.equal(p.runs.length,2);assert.equal(p.runs[0].bold,true);assert.equal(result.maskBoxes.length,2);
});

test('OCR mapping preserves RTL direction and normalized masks',()=>{
  const blocks=[{paragraphs:[{is_ltr:false,lines:[{text:'مرحبا بالعالم',bbox:{x0:200,y0:100,x1:800,y1:180},baseline:{y0:165,y1:165},words:[{text:'مرحبا',bbox:{x0:500,y0:100,x1:800,y1:180},font_name:'Noto Naskh Arabic'},{text:'بالعالم',bbox:{x0:200,y0:100,x1:470,y1:180},font_name:'Noto Naskh Arabic'}]}]}]}];
  const result=ocrBlocksToPositionedParagraphs(blocks,1000,1000,600,600);const p=result.paragraphs[0];assert.equal(p.rtl,true);assert.equal(p.align,'right');assert.ok(result.maskBoxes.every(b=>b.x0>=0&&b.x1<=1&&b.y0>=0&&b.y1<=1));
});

test('canvas text masking clears normalized OCR boxes',()=>{
  const calls=[];const ctx={save(){},restore(){},clearRect(...args){calls.push(args)}};const count=clearOcrTextFromCanvas(ctx,[{x0:.1,y0:.2,x1:.3,y1:.25}],1000,800);assert.equal(count,1);assert.equal(calls.length,1);assert.ok(calls[0][0]<100);assert.ok(calls[0][1]<160);assert.ok(calls[0][2]>200);
});
