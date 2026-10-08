import test from'node:test';import assert from'node:assert/strict';import{passportSize,packRects,contactSheetPlan,posterPlan,posterPlanForSize,PAPER}from'../assets/js/print-layout-core.mjs';
test('US passport preset is 600px at 300dpi',()=>{const s=passportSize('us',300);assert.equal(s.widthPx,600);assert.equal(s.heightPx,600)});
test('4x6 sheet packs six US passport photos',()=>{const s=passportSize('us',300),p=packRects(PAPER.photo4x6.width,PAPER.photo4x6.height,s.widthPt,s.heightPt,{margin:0,gap:0});assert.equal(p.count,6)});
test('contact sheet grid count',()=>{const p=contactSheetPlan(PAPER.letter.width,PAPER.letter.height,3,4);assert.equal(p.perPage,12)});
test('poster plan creates requested tiles',()=>{const p=posterPlan({imageWidth:1200,imageHeight:800,pageWidth:612,pageHeight:792,cols:2,rows:3,overlap:18});assert.equal(p.pageCount,6);assert.equal(p.tiles.at(-1).col,1)});
test('exact poster size derives page grid',()=>{const p=posterPlanForSize({imageWidth:1200,imageHeight:800,pageWidth:612,pageHeight:792,posterWidth:1000,posterHeight:1400,overlap:18});assert.equal(p.cols,2);assert.equal(p.rows,2);assert.equal(p.pageCount,4)});
test('expanded poster paper sizes are available',()=>{assert.ok(PAPER.a3.width>PAPER.a4.width);assert.ok(PAPER.legal.height>PAPER.letter.height);assert.ok(PAPER.tabloid.width>PAPER.letter.width)});
test('poster plan reports rows and columns',()=>{const p=posterPlan({imageWidth:1200,imageHeight:800,pageWidth:612,pageHeight:792,cols:3,rows:2,overlap:18});assert.equal(p.cols,3);assert.equal(p.rows,2)});
