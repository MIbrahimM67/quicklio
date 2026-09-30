import test from'node:test';
import assert from'node:assert/strict';
import{detectTables,tableSourceLineSet}from'../assets/js/pdf-to-word-table.mjs';
import{buildDocxPartsWithTables,tableXml}from'../assets/js/pdf-to-word-table-docx.mjs';

function line(text,x,y,{width=70,bold=false,fontSize=11}={}){
  return{text,xMin:x,xMax:x+width,y,fontSize,bold,italic:false,rtl:false,vertical:false,columnSplit:true,runs:[{text,fontSize,bold,italic:false,rtl:false}]};
}

function sampleTableLines(){
  return[
    line('Item',72,700,{bold:true,width:60}),line('Qty',220,700,{bold:true,width:30}),line('Price',360,700,{bold:true,width:42}),
    line('Paper',72,680,{width:55}),line('2',220,680,{width:8}),line('$12',360,680,{width:24}),
    line('Ink',72,660,{width:28}),line('1',220,660,{width:8}),line('$25',360,660,{width:24})
  ];
}

test('detects a repeated rectangular table and preserves source lines',()=>{
  const lines=sampleTableLines();const tables=detectTables(lines,612,792);
  assert.equal(tables.length,1);assert.equal(tables[0].columns,3);assert.equal(tables[0].rows.length,3);
  assert.equal(tables[0].headerRow,true);assert.ok(tables[0].confidence>=.78);
  assert.equal(tables[0].rows[1].cells[0].text,'Paper');assert.equal(tables[0].rows[2].cells[2].text,'$25');
  assert.equal(tableSourceLineSet(tables).size,9);
});

test('does not misclassify ordinary two-column prose as a table',()=>{
  const rows=[];
  for(let i=0;i<4;i++){
    rows.push(line(`This is a fairly long paragraph sentence in the left column ${i+1}.`,72,700-i*16,{width:210}));
    rows.push(line(`This is another fairly long paragraph sentence in the right column ${i+1}.`,330,700-i*16,{width:210}));
  }
  assert.equal(detectTables(rows,612,792).length,0);
});

test('native Word table XML keeps cells editable and header semantic',()=>{
  const table=detectTables(sampleTableLines(),612,792)[0];const xml=tableXml(table,'editable');
  assert.match(xml,/<w:tbl>/);assert.match(xml,/<w:tblHeader\/>/);assert.match(xml,/Paper/);assert.match(xml,/\$25/);
  assert.match(xml,/w:val="single"/);assert.doesNotMatch(xml,/w:tblpPr/);
});

test('Hybrid table is page-anchored and replaces the placeholder in DOCX',()=>{
  const table=detectTables(sampleTableLines(),612,792)[0];
  const pages=[{pageNumber:1,widthPt:612,heightPt:792,paragraphs:[{text:'Report',fontSize:16,layoutText:'Report',layoutXPt:72,layoutWidthPt:100,layoutFirstBaselinePt:740,layoutLastBaselinePt:740,lineCount:1,ascent:.82,layoutRunLines:[[{text:'Report',fontSize:16,bold:true,italic:false,rtl:false}]]}],tables:[table]}];
  const parts=buildDocxPartsWithTables(pages,'Table Test',{mode:'hybrid'}),xml=parts['word/document.xml'];
  assert.match(xml,/<w:tbl>/);assert.match(xml,/w:vertAnchor="page"/);assert.match(xml,/w:horzAnchor="page"/);
  assert.match(xml,/w:val="nil"/);assert.match(xml,/Report/);assert.match(xml,/Paper/);assert.doesNotMatch(xml,/__QL_TABLE_/);
});
