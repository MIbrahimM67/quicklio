import test from'node:test';
import assert from'node:assert/strict';
import{escapeXml,textItemsToLines,linesToParagraphs,analyzeTextPage,ocrTextToParagraphs,buildDocumentXml,buildDocxParts}from'../assets/js/pdf-to-word-core.mjs';

test('xml escaping removes invalid chars',()=>assert.equal(escapeXml('<A&B>\u0001'),'&lt;A&amp;B&gt;'));

test('text items group into readable lines',()=>{
  const lines=textItemsToLines([
    {str:'Hello',transform:[12,0,0,12,10,100],width:28,fontName:'Arial'},
    {str:'world',transform:[12,0,0,12,45,100],width:30,fontName:'Arial'},
    {str:'Next',transform:[12,0,0,12,10,80],width:25,fontName:'Arial-Bold'}
  ]);
  assert.equal(lines.length,2);assert.equal(lines[0].text,'Hello world');assert.equal(lines[1].text,'Next');assert.equal(lines[1].bold,true);
});

test('wrapped lines become paragraphs with layout hints',()=>{
  const p=linesToParagraphs([
    {text:'Centered heading',y:120,xMin:210,xMax:402,fontSize:18,bold:true,italic:false,wideGaps:0},
    {text:'This is a wrapped',y:90,xMin:72,xMax:260,fontSize:10,bold:false,italic:false,wideGaps:0},
    {text:'sentence.',y:78,xMin:72,xMax:140,fontSize:10,bold:false,italic:false,wideGaps:0},
    {text:'Indented block',y:50,xMin:110,xMax:220,fontSize:10,bold:false,italic:false,wideGaps:0}
  ],612);
  assert.equal(p[0].align,'center');
  assert.equal(p[1].text,'This is a wrapped sentence.');
  assert.equal(p[1].layoutText,'This is a wrapped\nsentence.');
  assert.equal(p[1].layoutXPt,72);
  assert.equal(p[1].layoutFirstBaselinePt,90);
  assert.equal(p[1].layoutLastBaselinePt,78);
  assert.ok(p[1].layoutWidthPt>=188);
  assert.ok(p.at(-1).leftIndentPt>0);
});

test('scan and complex layout diagnostics',()=>{
  assert.equal(analyzeTextPage([],600).scannedLikely,true);
  const lines=Array.from({length:10},(_,i)=>({text:'abc',xMin:i%2?280:20,wideGaps:i<4?1:0}));
  assert.equal(analyzeTextPage(lines,600).complexLayout,true);
});

test('ocr text converts to editable paragraphs',()=>{
  const p=ocrTextToParagraphs('First line\nsecond line\n\nNext');
  assert.equal(p.length,2);assert.equal(p[0].text,'First line second line');assert.equal(p[0].align,'left');
});

test('editable docx preserves page sizing and paragraph formatting hints',()=>{
  const xml=buildDocumentXml([
    {widthPt:612,heightPt:792,paragraphs:[{text:'Page one',fontSize:11,align:'center',leftIndentPt:18,spaceAfterPt:6}]},
    {widthPt:612,heightPt:792,paragraphs:[{text:'Page two',fontSize:11}]}
  ],{mode:'editable'});
  assert.match(xml,/Page one/);assert.match(xml,/w:jc w:val="center"/);assert.match(xml,/w:ind w:left="360"/);assert.match(xml,/w:pgSz w:w="12240" w:h="15840"/);assert.match(xml,/Page two/);
});

test('layout docx references page images and png content type',()=>{
  const pages=[{pageNumber:1,widthPt:612,heightPt:792,imagePixelWidth:1020,imagePixelHeight:1320,imageName:'page-001.png',imageRelId:'rIdImage1'}];
  const xml=buildDocumentXml(pages,{mode:'layout'});const parts=buildDocxParts(pages,'Layout Test',{mode:'layout'});
  assert.match(xml,/<w:drawing>/);assert.match(xml,/r:embed="rIdImage1"/);assert.match(parts['[Content_Types].xml'],/Extension="png" ContentType="image\/png"/);assert.match(parts['word/_rels/document.xml.rels'],/Target="media\/page-001.png"/);assert.match(parts['docProps/core.xml'],/Layout Test/);
});

test('hybrid docx keeps editable text, page coordinates, and a behind-text visual layer',()=>{
  const pages=[{pageNumber:1,widthPt:612,heightPt:792,paragraphs:[{
    text:'Editable report text',layoutText:'Editable report\ntext',fontSize:11,bold:false,italic:false,lineCount:2,
    layoutXPt:72,layoutWidthPt:180,layoutFirstBaselinePt:680,layoutLastBaselinePt:666
  }],imagePixelWidth:1020,imagePixelHeight:1320,imageName:'visual-001.png',imageRelId:'rIdImage1'}];
  const xml=buildDocumentXml(pages,{mode:'hybrid'});const parts=buildDocxParts(pages,'Hybrid Test',{mode:'hybrid'});
  assert.match(xml,/Editable report/);
  assert.match(xml,/<w:br\/><w:t xml:space="preserve">text<\/w:t>/);
  assert.match(xml,/<w:framePr /);
  assert.match(xml,/w:hAnchor="page"/);
  assert.match(xml,/w:vAnchor="page"/);
  assert.match(xml,/w:x="1440"/);
  assert.match(xml,/wp:anchor/);
  assert.match(xml,/behindDoc="1"/);
  assert.match(xml,/r:embed="rIdImage1"/);
  assert.match(parts['[Content_Types].xml'],/Extension="png" ContentType="image\/png"/);
  assert.match(parts['word/_rels/document.xml.rels'],/Target="media\/visual-001.png"/);
});

test('hybrid falls back to flowing editable text when coordinates are unavailable',()=>{
  const xml=buildDocumentXml([{widthPt:612,heightPt:792,paragraphs:[{text:'OCR fallback',fontSize:11,align:'left'}]}],{mode:'hybrid'});
  assert.match(xml,/OCR fallback/);
  assert.doesNotMatch(xml,/<w:framePr /);
});
