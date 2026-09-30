import test from'node:test';
import assert from'node:assert/strict';
import{textItemsToFidelityLines,applyLinksToLines,restoreFidelityParagraphRuns,enrichParagraphOrientation,positionedParagraphsToLines,detectRepeatingHeadersFooters,normalizeFontFamily}from'../assets/js/pdf-to-word-fidelity.mjs';
import{linesToParagraphs}from'../assets/js/pdf-to-word-core.mjs';
import{detectTables}from'../assets/js/pdf-to-word-table.mjs';
import{buildDocxPartsWithTables}from'../assets/js/pdf-to-word-table-docx.mjs';

test('font substitution normalizes common embedded PDF fonts',()=>{
  assert.equal(normalizeFontFamily('ABCDEF+Helvetica, sans-serif'),'Arial');
  assert.equal(normalizeFontFamily('Times-Roman'),'Times New Roman');
  assert.equal(normalizeFontFamily('CourierNewPSMT'),'Courier New');
});

test('fidelity lines keep superscript and vertical text signals',()=>{
  const lines=textItemsToFidelityLines([
    {str:'x',transform:[12,0,0,12,72,650],width:8,fontName:'F1'},
    {str:'2',transform:[8,0,0,8,81,654],width:5,fontName:'F1'},
    {str:'VERT',transform:[0,12,-12,0,420,600],width:40,fontName:'F2'}
  ],612,{F1:{fontFamily:'ABCDEF+Helvetica, sans-serif'},F2:{fontFamily:'Times-Roman'}});
  const horizontal=lines.find(l=>l.text.includes('x'));
  assert.ok(horizontal);
  assert.equal(horizontal.runs.find(r=>r.text.includes('2')).vertAlign,'superscript');
  assert.equal(horizontal.runs[0].fontFamily,'Arial');
  const vertical=lines.find(l=>l.text==='VERT');
  assert.equal(vertical.vertical,true);
  assert.ok(Math.abs(Math.abs(vertical.rotationDeg)-90)<1);
});

test('PDF link annotations attach only to overlapping text runs',()=>{
  const lines=textItemsToFidelityLines([
    {str:'OpenAI',transform:[11,0,0,11,72,650],width:42,fontName:'F1'},
    {str:' plain',transform:[11,0,0,11,120,650],width:32,fontName:'F1'}
  ],612,{F1:{fontFamily:'Arial'}});
  const matched=applyLinksToLines(lines,[{url:'https://openai.com/',rect:[70,642,116,662]}]);
  assert.equal(matched,1);
  assert.equal(lines[0].runs[0].href,'https://openai.com/');
  assert.equal(lines[0].runs.at(-1).href,undefined);
});

test('paragraph reconstruction retains fidelity run metadata',()=>{
  const lines=textItemsToFidelityLines([
    {str:'x',transform:[12,0,0,12,72,650],width:8,fontName:'F1'},
    {str:'2',transform:[8,0,0,8,81,654],width:5,fontName:'F1'}
  ],612,{F1:{fontFamily:'Arial'}});
  const p=enrichParagraphOrientation(restoreFidelityParagraphRuns(linesToParagraphs(lines,612)),lines);
  assert.equal(p[0].runs.some(r=>r.vertAlign==='superscript'),true);
});

test('repeated page furniture becomes Word header and footer candidates',()=>{
  const pages=Array.from({length:3},(_,i)=>({pageNumber:i+1,heightPt:792,paragraphs:[
    {text:'Quarterly Report',layoutFirstBaselinePt:760,runs:[{text:'Quarterly Report',fontSize:9}],align:'center'},
    {text:`Body ${i+1}`,layoutFirstBaselinePt:500,runs:[{text:`Body ${i+1}`,fontSize:11}]},
    {text:`Page ${i+1} of 3`,layoutFirstBaselinePt:30,runs:[{text:`Page ${i+1} of 3`,fontSize:9}],align:'center'}
  ]}));
  const result=detectRepeatingHeadersFooters(pages);
  assert.equal(result.header.items[0].text,'Quarterly Report');
  assert.equal(result.footer.items[0].dynamic,'pageOfPages');
  assert.equal(pages.every(p=>p.paragraphs.length===1),true);
});

test('OCR-positioned lines can reconstruct a native table with merged cells',()=>{
  const make=(text,x,y,w=70,h=12,bold=false)=>({text,fontSize:11,bold,italic:false,rtl:false,runs:[{text,fontSize:11,bold,italic:false,rtl:false}],layoutXPt:x,layoutRightPt:x+w,layoutWidthPt:w,layoutFirstBaselinePt:y,layoutLastBaselinePt:y,ocrBoxHeightPt:h});
  const paragraphs=[
    make('Summary',70,700,240,12,true),make('Total',330,700,60,12,true),
    make('A',70,680,50,38),make('10',200,680,30),make('20',330,680,30),
    make('11',200,660,30),make('21',330,660,30),
    make('B',70,640,30),make('12',200,640,30),make('22',330,640,30)
  ];
  const lines=positionedParagraphsToLines(paragraphs),tables=detectTables(lines,612,792);
  assert.equal(tables.length,1);
  assert.equal(tables[0].rows[0].cells[0].gridSpan,2);
  assert.equal(tables[0].rows[1].cells[0].vMerge,'restart');
  assert.equal(tables[0].rows[2].cells[0].vMerge,'continue');
});

test('DOCX output preserves links scripts vertical text spans headers and footers',()=>{
  const pages=[{pageNumber:1,widthPt:612,heightPt:792,paragraphs:[
    {text:'Visit x2',fontSize:11,runs:[{text:'Visit ',fontSize:11},{text:'OpenAI',fontSize:11,href:'https://openai.com/'},{text:' x',fontSize:11},{text:'2',fontSize:8,vertAlign:'superscript'}],layoutText:'Visit x2',layoutXPt:72,layoutWidthPt:150,layoutFirstBaselinePt:650,layoutLastBaselinePt:650,lineCount:1,ascent:.82,layoutRunLines:[[{text:'Visit ',fontSize:11},{text:'OpenAI',fontSize:11,href:'https://openai.com/'},{text:' x',fontSize:11},{text:'2',fontSize:8,vertAlign:'superscript'}]]},
    {text:'Vertical',fontSize:11,vertical:true,verticalDirection:'tbRl',runs:[{text:'Vertical',fontSize:11}],layoutText:'Vertical',layoutXPt:450,layoutWidthPt:70,layoutFirstBaselinePt:600,layoutLastBaselinePt:600,lineCount:1,ascent:.82,layoutRunLines:[[{text:'Vertical',fontSize:11}]]}
  ],tables:[{xPt:72,yTopPt:200,widthPt:300,columnWidthsPt:[100,100,100],headerRow:true,rows:[
    {cells:[{text:'Merged',runs:[{text:'Merged',fontSize:10,bold:true}],fontSize:10,bold:true,gridSpan:2},{text:'',runs:[],skip:true},{text:'C',runs:[{text:'C',fontSize:10,bold:true}],fontSize:10,bold:true}]},
    {cells:[{text:'Tall',runs:[{text:'Tall',fontSize:10}],fontSize:10,vMerge:'restart'},{text:'B',runs:[{text:'B',fontSize:10}],fontSize:10},{text:'C2',runs:[{text:'C2',fontSize:10}],fontSize:10}]},
    {cells:[{text:'',runs:[],vMerge:'continue'},{text:'B2',runs:[{text:'B2',fontSize:10}],fontSize:10},{text:'C3',runs:[{text:'C3',fontSize:10}],fontSize:10}]}
  ]}]}];
  const parts=buildDocxPartsWithTables(pages,'Fidelity',{mode:'hybrid',header:{items:[{text:'Quarterly Report',runs:[{text:'Quarterly Report',fontSize:9}],align:'center'}]},footer:{items:[{text:'Page 1 of 3',dynamic:'pageOfPages',align:'center'}]}}),xml=parts['word/document.xml'],rels=parts['word/_rels/document.xml.rels'];
  assert.match(xml,/<w:hyperlink r:id="rIdQlLink1"/);
  assert.match(xml,/<w:vertAlign w:val="superscript"\/>/);
  assert.match(xml,/<w:textDirection w:val="tbRl"\/>/);
  assert.match(xml,/<w:gridSpan w:val="2"\/>/);
  assert.match(xml,/<w:vMerge w:val="restart"\/>/);
  assert.match(xml,/<w:vMerge\/>/);
  assert.match(rels,/relationships\/hyperlink/);
  assert.ok(parts['word/header1.xml']);
  assert.ok(parts['word/footer1.xml']);
  assert.match(parts['word/footer1.xml'],/NUMPAGES/);
});
