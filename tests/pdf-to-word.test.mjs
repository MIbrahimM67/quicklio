import test from'node:test';
import assert from'node:assert/strict';
import{escapeXml,textItemsToLines,linesToParagraphs,analyzeTextPage,ocrTextToParagraphs,buildDocumentXml,buildDocxParts}from'../assets/js/pdf-to-word-core.mjs';

test('xml escaping removes invalid chars',()=>assert.equal(escapeXml('<A&B>\u0001'),'&lt;A&amp;B&gt;'));

test('text items group into readable lines',()=>{
  const lines=textItemsToLines([
    {str:'Hello',transform:[12,0,0,12,10,100],width:28,fontName:'Arial'},
    {str:'world',transform:[12,0,0,12,45,100],width:30,fontName:'Arial'},
    {str:'Next',transform:[12,0,0,12,10,80],width:25,fontName:'Arial-Bold'}
  ],612);
  assert.equal(lines.length,2);assert.equal(lines[0].text,'Hello world');assert.equal(lines[1].text,'Next');assert.equal(lines[1].bold,true);
});

test('same-baseline columns are split into independent positioned lines',()=>{
  const lines=textItemsToLines([
    {str:'Left column sentence',transform:[11,0,0,11,72,700],width:110,fontName:'Arial'},
    {str:'Right column sentence',transform:[11,0,0,11,330,700],width:120,fontName:'Arial'},
    {str:'Left next line',transform:[11,0,0,11,72,684],width:75,fontName:'Arial'},
    {str:'Right next line',transform:[11,0,0,11,330,684],width:82,fontName:'Arial'}
  ],612);
  assert.equal(lines.length,4);
  assert.equal(lines[0].text,'Left column sentence');assert.equal(lines[1].text,'Right column sentence');
  assert.equal(lines[0].columnSplit,true);assert.equal(lines[1].columnSplit,true);
});

test('two-column reading order joins each column without interleaving them',()=>{
  const items=[];
  for(let i=0;i<4;i++){
    items.push({str:`Left ${i+1}`,transform:[11,0,0,11,72,700-i*16],width:55,fontName:'Arial'});
    items.push({str:`Right ${i+1}`,transform:[11,0,0,11,330,700-i*16],width:60,fontName:'Arial'});
  }
  const p=linesToParagraphs(textItemsToLines(items,612),612);
  assert.equal(p.length,2);
  assert.equal(p[0].columnId,'left');assert.equal(p[1].columnId,'right');
  assert.match(p[0].text,/Left 1 Left 2 Left 3 Left 4/);
  assert.match(p[1].text,/Right 1 Right 2 Right 3 Right 4/);
  assert.equal(p[0].layoutXPt,72);assert.equal(p[1].layoutXPt,330);
});

test('mixed inline styles remain distinct runs',()=>{
  const lines=textItemsToLines([
    {str:'Revenue ',transform:[11,0,0,11,72,650],width:48,fontName:'Arial'},
    {str:'up 12%',transform:[11,0,0,11,120,650],width:38,fontName:'Arial-Bold'},
    {str:' today',transform:[11,0,0,11,158,650],width:34,fontName:'Arial-Italic'}
  ],612);
  assert.equal(lines.length,1);assert.equal(lines[0].runs.length,3);
  assert.equal(lines[0].runs[1].bold,true);assert.equal(lines[0].runs[2].italic,true);
  const p=linesToParagraphs(lines,612);const xml=buildDocumentXml([{widthPt:612,heightPt:792,paragraphs:p}],{mode:'hybrid'});
  assert.match(xml,/<w:b\/>[\s\S]*up 12%/);assert.match(xml,/<w:i\/>[\s\S]*today/);
});

test('font family, RTL direction, and font ascent survive into Word XML',()=>{
  const styles={fRTL:{fontFamily:'"Noto Naskh Arabic", serif',ascent:.91,vertical:false}};
  const lines=textItemsToLines([
    {str:'مرحبا بالعالم',dir:'rtl',transform:[14,0,0,14,300,650],width:100,fontName:'fRTL'}
  ],612,styles);
  assert.equal(lines[0].rtl,true);assert.equal(lines[0].runs[0].fontFamily,'Noto Naskh Arabic');
  const p=linesToParagraphs(lines,612);
  assert.ok(p[0].ascent>=.9);
  const xml=buildDocumentXml([{widthPt:612,heightPt:792,paragraphs:p}],{mode:'hybrid'});
  assert.match(xml,/<w:bidi\/>/);assert.match(xml,/<w:rtl\/>/);
  assert.match(xml,/w:rFonts w:ascii="Noto Naskh Arabic"/);
});

test('wrapped lines become paragraphs with layout hints',()=>{
  const p=linesToParagraphs([
    {text:'Centered heading',y:120,xMin:210,xMax:402,fontSize:18,bold:true,italic:false,rtl:false,wideGaps:0,runs:[{text:'Centered heading',fontSize:18,bold:true,italic:false,rtl:false}],ascent:.82},
    {text:'This is a wrapped',y:90,xMin:72,xMax:260,fontSize:10,bold:false,italic:false,rtl:false,wideGaps:0,runs:[{text:'This is a wrapped',fontSize:10,bold:false,italic:false,rtl:false}],ascent:.82},
    {text:'sentence.',y:78,xMin:72,xMax:140,fontSize:10,bold:false,italic:false,rtl:false,wideGaps:0,runs:[{text:'sentence.',fontSize:10,bold:false,italic:false,rtl:false}],ascent:.82},
    {text:'Indented block',y:50,xMin:110,xMax:220,fontSize:10,bold:false,italic:false,rtl:false,wideGaps:0,runs:[{text:'Indented block',fontSize:10,bold:false,italic:false,rtl:false}],ascent:.82}
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
  const lines=Array.from({length:10},(_,i)=>({text:'abc',xMin:i%2?280:20,wideGaps:i<4?1:0,vertical:false,rtl:false}));
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
    text:'Editable report text',layoutText:'Editable report\ntext',fontSize:11,bold:false,italic:false,rtl:false,lineCount:2,
    layoutXPt:72,layoutWidthPt:180,layoutFirstBaselinePt:680,layoutLastBaselinePt:666,ascent:.82,
    layoutRunLines:[[{text:'Editable report',fontSize:11,bold:false,italic:false,rtl:false}],[{text:'text',fontSize:11,bold:false,italic:false,rtl:false}]]
  }],imagePixelWidth:1020,imagePixelHeight:1320,imageName:'visual-001.png',imageRelId:'rIdImage1'}];
  const xml=buildDocumentXml(pages,{mode:'hybrid'});const parts=buildDocxParts(pages,'Hybrid Test',{mode:'hybrid'});
  assert.match(xml,/Editable report/);
  assert.match(xml,/<w:r><w:br\/><\/w:r>/);
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
