import{buildDocxParts,escapeXml}from'./pdf-to-word-core.mjs';
import{normalizeFontFamily}from'./pdf-to-word-fidelity.mjs';

const twips=(points,fallback=0)=>Math.round((Number.isFinite(Number(points))?Number(points):fallback)*20);
const sizeHalfPoints=size=>Math.max(18,Math.min(96,Math.round((Number(size)||11)*2)));

function runPropsXml(run={},fallback={}){
  const fontSize=Number(run.fontSize)||Number(fallback.fontSize)||11,bold=run.bold??fallback.bold,italic=run.italic??fallback.italic,rtl=run.rtl??fallback.rtl;
  const family=normalizeFontFamily(run.fontFamily||fallback.fontFamily||''),size=sizeHalfPoints(fontSize);
  return`${family?`<w:rFonts w:ascii="${escapeXml(family)}" w:hAnsi="${escapeXml(family)}" w:cs="${escapeXml(family)}"/>`:''}${bold?'<w:b/>':''}${italic?'<w:i/>':''}${rtl?'<w:rtl/>':''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
}

function cellRunsXml(cell={}){
  const source=Array.isArray(cell.runs)&&cell.runs.length?cell.runs:[{text:cell.text||'',fontSize:cell.fontSize,bold:cell.bold,italic:cell.italic,rtl:cell.rtl}];
  return source.map(run=>{if(run.text==='\n')return'<w:r><w:br/></w:r>';if(!String(run.text??''))return'';return`<w:r><w:rPr>${runPropsXml(run,cell)}</w:rPr><w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;}).join('');
}

function tableXml(table={},mode='editable'){
  const widths=(table.columnWidthsPt||[]).map(w=>Math.max(240,twips(w,72))),total=Math.max(480,widths.reduce((a,b)=>a+b,0));
  const floating=mode==='hybrid'?`<w:tblpPr w:leftFromText="0" w:rightFromText="0" w:topFromText="0" w:bottomFromText="0" w:vertAnchor="page" w:horzAnchor="page" w:tblpX="${Math.max(0,twips(table.xPt))}" w:tblpY="${Math.max(0,twips(table.yTopPt))}"/>`:'';
  const borders=mode==='hybrid'?'<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>':'<w:tblBorders><w:top w:val="single" w:sz="4" w:color="B7B7B7"/><w:left w:val="single" w:sz="4" w:color="B7B7B7"/><w:bottom w:val="single" w:sz="4" w:color="B7B7B7"/><w:right w:val="single" w:sz="4" w:color="B7B7B7"/><w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders>';
  const grid=`<w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
  const rows=(table.rows||[]).map((row,rowIndex)=>{
    const rowPr=rowIndex===0&&table.headerRow?'<w:trPr><w:tblHeader/></w:trPr>':'';let cells='';
    for(let colIndex=0;colIndex<(row.cells||[]).length;colIndex++){
      const cell=row.cells[colIndex]||{};if(cell.skip)continue;const span=Math.max(1,Number(cell.gridSpan)||1),width=widths.slice(colIndex,colIndex+span).reduce((a,b)=>a+b,0)||(widths[colIndex]||Math.round(total/Math.max(1,widths.length))),bidi=cell.rtl?'<w:bidi/>':'',gridSpan=span>1?`<w:gridSpan w:val="${span}"/>`:'',vMerge=cell.vMerge==='restart'?'<w:vMerge w:val="restart"/>':cell.vMerge==='continue'?'<w:vMerge/>':'';
      cells+=`<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${gridSpan}${vMerge}<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr>${bidi}<w:spacing w:before="0" w:after="0"/></w:pPr>${cellRunsXml(cell)}</w:p></w:tc>`;
    }
    return`<w:tr>${rowPr}${cells}</w:tr>`;
  }).join('');
  return`<w:tbl><w:tblPr>${floating}<w:tblW w:w="${total}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>${grid}${rows}</w:tbl>`;
}

function verticalParagraphXml(p={},page={},mode='hybrid'){
  const pageH=Math.max(72,Number(page.heightPt)||792),font=Math.max(6,Number(p.fontSize)||11),xPt=Math.max(0,Number(p.layoutXPt)||0),baseline=Number(p.layoutFirstBaselinePt),topPt=Number.isFinite(baseline)?Math.max(0,pageH-baseline-font*.9):0,heightPt=Math.max(36,Number(p.layoutWidthPt)||font*4),widthPt=Math.max(18,font*1.7),direction=p.verticalDirection==='btLr'?'btLr':'tbRl';
  const floating=Number.isFinite(baseline)?`<w:tblpPr w:leftFromText="0" w:rightFromText="0" w:topFromText="0" w:bottomFromText="0" w:vertAnchor="page" w:horzAnchor="page" w:tblpX="${twips(xPt)}" w:tblpY="${twips(topPt)}"/>`:'';
  const cell={text:p.text,runs:Array.isArray(p.runs)&&p.runs.length?p.runs:[{text:p.text,fontSize:p.fontSize,bold:p.bold,italic:p.italic,rtl:p.rtl}],fontSize:p.fontSize,bold:p.bold,italic:p.italic,rtl:p.rtl};
  return`<w:tbl><w:tblPr>${floating}<w:tblW w:w="${twips(widthPt)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="${twips(widthPt)}"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="${twips(heightPt)}" w:hRule="atLeast"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${twips(widthPt)}" w:type="dxa"/><w:textDirection w:val="${direction}"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${p.rtl?'<w:bidi/>':''}</w:pPr>${cellRunsXml(cell)}</w:p></w:tc></w:tr></w:tbl>`;
}

function markerParagraph(marker,item,page,mode){
  if(mode!=='hybrid')return{text:marker,fontSize:8,bold:false,italic:false,rtl:false,align:'left',runs:[{text:marker,fontSize:8,bold:false,italic:false,rtl:false}]};
  const pageH=Math.max(72,Number(page.heightPt)||792),fontSize=8,yTop=item.kind==='table'?(Number(item.value.yTopPt)||0):Math.max(0,pageH-(Number(item.value.layoutFirstBaselinePt)||pageH)-fontSize*.8),x=item.kind==='table'?(Number(item.value.xPt)||0):(Number(item.value.layoutXPt)||0),width=item.kind==='table'?(Number(item.value.widthPt)||72):(Number(item.value.layoutWidthPt)||72),baseline=Math.max(1,pageH-yTop-fontSize*.82);
  return{text:marker,layoutText:marker,fontSize,bold:false,italic:false,rtl:false,lineCount:1,layoutXPt:x,layoutWidthPt:width,layoutFirstBaselinePt:baseline,layoutLastBaselinePt:baseline,ascent:.82,layoutRunLines:[[{text:marker,fontSize,bold:false,italic:false,rtl:false}]]};
}

function orderValue(item,page){if(item.kind==='table')return Math.max(0,(Number(page.heightPt)||792)-(Number(item.value.yTopPt)||0));return Number(item.value.layoutFirstBaselinePt)||-Infinity}

function preparePages(pages=[],mode){
  const replacements=[];
  const prepared=pages.map((page,pageIndex)=>{
    const items=(page.paragraphs||[]).map(p=>({kind:'paragraph',value:p}));(page.tables||[]).forEach((table,tableIndex)=>items.push({kind:'table',value:table,tableIndex}));items.sort((a,b)=>orderValue(b,page)-orderValue(a,page));const paragraphs=[];let verticalIndex=0;
    for(const item of items){
      if(item.kind==='paragraph'&&!item.value.vertical){paragraphs.push(item.value);continue}
      const marker=item.kind==='table'?`__QL_TABLE_${pageIndex}_${item.tableIndex}__`:`__QL_VERTICAL_${pageIndex}_${verticalIndex++}__`;paragraphs.push(markerParagraph(marker,item,page,mode));replacements.push({marker,xml:item.kind==='table'?tableXml(item.value,mode):verticalParagraphXml(item.value,page,mode)});
    }
    return{...page,paragraphs};
  });
  return{prepared,replacements};
}

function replaceMarkerParagraph(xml,marker,replacement){const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),pattern=new RegExp(`<w:p>(?:(?!<w:p>).)*?<w:t[^>]*>${escaped}<\\/w:t>(?:(?!<w:p>).)*?<\\/w:p>`,'s');return xml.replace(pattern,replacement)}

function activeParagraphRuns(p,mode){if(mode==='hybrid'&&Array.isArray(p.layoutRunLines)&&p.layoutRunLines.length)return p.layoutRunLines.flat();return Array.isArray(p.runs)?p.runs:[]}
function markRun(run,records,linkIds){
  if(!run||!String(run.text??'')||(!run.href&&!run.vertAlign))return;const original=String(run.text),marker=`__QL_RUN_${records.length}__`;let relId='';
  if(run.href){if(!linkIds.has(run.href))linkIds.set(run.href,`rIdQlLink${linkIds.size+1}`);relId=linkIds.get(run.href)}
  records.push({marker,original,vertAlign:run.vertAlign||'',href:run.href||'',relId});run.text=marker;
}
function markFidelityRuns(pages,mode){
  const records=[],linkIds=new Map();
  for(const page of pages){for(const p of page.paragraphs||[])for(const run of activeParagraphRuns(p,mode))markRun(run,records,linkIds);for(const table of page.tables||[])for(const row of table.rows||[])for(const cell of row.cells||[])for(const run of cell.runs||[])markRun(run,records,linkIds);}
  return{records,linkIds};
}
function replaceRunMarker(xml,record){
  const escaped=record.marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),pattern=new RegExp(`<w:r>(?:(?!<w:r>).)*?<w:t([^>]*)>${escaped}<\\/w:t>(?:(?!<w:r>).)*?<\\/w:r>`,'s');const match=xml.match(pattern);if(!match)return xml;let runXml=match[0].replace(record.marker,escapeXml(record.original));
  if(record.vertAlign){const prop=`<w:vertAlign w:val="${record.vertAlign==='subscript'?'subscript':'superscript'}"/>`;runXml=runXml.includes('<w:rPr>')?runXml.replace('<w:rPr>','<w:rPr>'+prop):runXml.replace('<w:r>','<w:r><w:rPr>'+prop+'</w:rPr>');}
  if(record.href&&record.relId)runXml=`<w:hyperlink r:id="${record.relId}" w:history="1">${runXml}</w:hyperlink>`;
  return xml.replace(pattern,runXml);
}

function fieldRun(code){return`<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${code} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`}
function headerFooterItemXml(item={}){
  const align=['left','center','right','both'].includes(item.align)?item.align:'center';let body='';
  if(item.dynamic==='page')body=/page/i.test(item.text||'')?`<w:r><w:t xml:space="preserve">Page </w:t></w:r>${fieldRun('PAGE')}`:fieldRun('PAGE');
  else if(item.dynamic==='pageOfPages')body=`<w:r><w:t xml:space="preserve">Page </w:t></w:r>${fieldRun('PAGE')}<w:r><w:t xml:space="preserve"> of </w:t></w:r>${fieldRun('NUMPAGES')}`;
  else{const runs=Array.isArray(item.runs)&&item.runs.length?item.runs:[{text:item.text||'',fontSize:9}];body=runs.map(run=>`<w:r><w:rPr>${runPropsXml(run,{fontSize:9})}</w:rPr><w:t xml:space="preserve">${escapeXml(run.text||'')}</w:t></w:r>`).join('');}
  return`<w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="0" w:after="0"/></w:pPr>${body}</w:p>`;
}
function headerFooterXml(descriptor={},type='header'){const root=type==='footer'?'w:ftr':'w:hdr';return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><${root} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${(descriptor.items||[]).map(headerFooterItemXml).join('')}</${root}>`}
function addHeaderFooterParts(parts,options={}){
  const refs=[];let rels=parts['word/_rels/document.xml.rels'],types=parts['[Content_Types].xml'];
  if(options.header?.items?.length){parts['word/header1.xml']=headerFooterXml(options.header,'header');rels=rels.replace('</Relationships>','<Relationship Id="rIdQlHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>');types=types.replace('</Types>','<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>');refs.push('<w:headerReference w:type="default" r:id="rIdQlHeader"/>');}
  if(options.footer?.items?.length){parts['word/footer1.xml']=headerFooterXml(options.footer,'footer');rels=rels.replace('</Relationships>','<Relationship Id="rIdQlFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>');types=types.replace('</Types>','<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>');refs.push('<w:footerReference w:type="default" r:id="rIdQlFooter"/>');}
  if(refs.length)parts['word/document.xml']=parts['word/document.xml'].replace(/<w:sectPr>/g,`<w:sectPr>${refs.join('')}`);parts['word/_rels/document.xml.rels']=rels;parts['[Content_Types].xml']=types;
}
function addHyperlinkRelationships(parts,linkIds){if(!linkIds.size)return;let rels=parts['word/_rels/document.xml.rels'];for(const[href,id]of linkIds)rels=rels.replace('</Relationships>',`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(href)}" TargetMode="External"/></Relationships>`);parts['word/_rels/document.xml.rels']=rels}

export function buildDocxPartsWithTables(pages=[],title='Converted PDF',options={}){
  const mode=options.mode==='layout'?'layout':options.mode==='hybrid'?'hybrid':'editable';if(mode==='layout')return buildDocxParts(pages,title,{mode});
  const cloned=typeof structuredClone==='function'?structuredClone(pages):JSON.parse(JSON.stringify(pages));const fidelity=markFidelityRuns(cloned,mode),{prepared,replacements}=preparePages(cloned,mode),parts=buildDocxParts(prepared,title,{mode});let documentXml=parts['word/document.xml'];
  for(const item of replacements)documentXml=replaceMarkerParagraph(documentXml,item.marker,item.xml);for(const record of fidelity.records)documentXml=replaceRunMarker(documentXml,record);parts['word/document.xml']=documentXml;addHyperlinkRelationships(parts,fidelity.linkIds);addHeaderFooterParts(parts,options);return parts;
}

export{tableXml,verticalParagraphXml};
