import{buildDocxParts,escapeXml}from'./pdf-to-word-core.mjs';

const twips=(points,fallback=0)=>Math.round((Number.isFinite(Number(points))?Number(points):fallback)*20);
const cleanFontFamily=value=>{const first=String(value||'').split(',')[0].trim().replace(/^["']|["']$/g,'');return!first||/^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(first)?'':first.slice(0,80)};
const sizeHalfPoints=size=>Math.max(18,Math.min(96,Math.round((Number(size)||11)*2)));

function runPropsXml(run={},fallback={}){
  const fontSize=Number(run.fontSize)||Number(fallback.fontSize)||11,bold=run.bold??fallback.bold,italic=run.italic??fallback.italic,rtl=run.rtl??fallback.rtl;
  const family=cleanFontFamily(run.fontFamily||fallback.fontFamily||''),size=sizeHalfPoints(fontSize);
  return`${family?`<w:rFonts w:ascii="${escapeXml(family)}" w:hAnsi="${escapeXml(family)}" w:cs="${escapeXml(family)}"/>`:''}${bold?'<w:b/>':''}${italic?'<w:i/>':''}${rtl?'<w:rtl/>':''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
}

function cellRunsXml(cell={}){
  const source=Array.isArray(cell.runs)&&cell.runs.length?cell.runs:[{text:cell.text||'',fontSize:cell.fontSize,bold:cell.bold,italic:cell.italic,rtl:cell.rtl}];
  return source.map(run=>{
    if(run.text==='\n')return'<w:r><w:br/></w:r>';
    if(!String(run.text??''))return'';
    return`<w:r><w:rPr>${runPropsXml(run,cell)}</w:rPr><w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
  }).join('');
}

function tableXml(table={},mode='editable'){
  const widths=(table.columnWidthsPt||[]).map(w=>Math.max(240,twips(w,72))),total=Math.max(480,widths.reduce((a,b)=>a+b,0));
  const floating=mode==='hybrid'?`<w:tblpPr w:leftFromText="0" w:rightFromText="0" w:topFromText="0" w:bottomFromText="0" w:vertAnchor="page" w:horzAnchor="page" w:tblpX="${Math.max(0,twips(table.xPt))}" w:tblpY="${Math.max(0,twips(table.yTopPt))}"/>`:'';
  const borders=mode==='hybrid'?'<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>':'<w:tblBorders><w:top w:val="single" w:sz="4" w:color="B7B7B7"/><w:left w:val="single" w:sz="4" w:color="B7B7B7"/><w:bottom w:val="single" w:sz="4" w:color="B7B7B7"/><w:right w:val="single" w:sz="4" w:color="B7B7B7"/><w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders>';
  const grid=`<w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
  const rows=(table.rows||[]).map((row,rowIndex)=>{
    const rowPr=rowIndex===0&&table.headerRow?'<w:trPr><w:tblHeader/></w:trPr>':'';
    const cells=(row.cells||[]).map((cell,colIndex)=>{
      const width=widths[colIndex]||Math.round(total/Math.max(1,widths.length));const bidi=cell.rtl?'<w:bidi/>':'';
      return`<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr>${bidi}<w:spacing w:before="0" w:after="0"/></w:pPr>${cellRunsXml(cell)}</w:p></w:tc>`;
    }).join('');
    return`<w:tr>${rowPr}${cells}</w:tr>`;
  }).join('');
  return`<w:tbl><w:tblPr>${floating}<w:tblW w:w="${total}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>${grid}${rows}</w:tbl>`;
}

function markerParagraph(marker,table,page,mode){
  if(mode!=='hybrid')return{text:marker,fontSize:8,bold:false,italic:false,rtl:false,align:'left',runs:[{text:marker,fontSize:8,bold:false,italic:false,rtl:false}],__tableMarker:marker};
  const pageH=Math.max(72,Number(page.heightPt)||792),fontSize=8;
  const baseline=Math.max(1,pageH-(Number(table.yTopPt)||0)-fontSize*.82);
  return{text:marker,layoutText:marker,fontSize,bold:false,italic:false,rtl:false,lineCount:1,layoutXPt:Number(table.xPt)||0,layoutWidthPt:Number(table.widthPt)||72,layoutFirstBaselinePt:baseline,layoutLastBaselinePt:baseline,ascent:.82,layoutRunLines:[[{text:marker,fontSize,bold:false,italic:false,rtl:false}]],__tableMarker:marker};
}

function orderValue(item,page){
  if(item.kind==='table')return Math.max(0,(Number(page.heightPt)||792)-(Number(item.value.yTopPt)||0));
  const p=item.value;return Number(p.layoutFirstBaselinePt)||-Infinity;
}

function preparePages(pages=[],mode){
  const replacements=[];
  const prepared=pages.map((page,pageIndex)=>{
    const items=(page.paragraphs||[]).map(p=>({kind:'paragraph',value:p}));
    (page.tables||[]).forEach((table,tableIndex)=>items.push({kind:'table',value:table,tableIndex}));
    items.sort((a,b)=>orderValue(b,page)-orderValue(a,page));
    const paragraphs=[];
    for(const item of items){
      if(item.kind==='paragraph'){paragraphs.push(item.value);continue}
      const marker=`__QL_TABLE_${pageIndex}_${item.tableIndex}__`;
      paragraphs.push(markerParagraph(marker,item.value,page,mode));
      replacements.push({marker,xml:tableXml(item.value,mode)});
    }
    return{...page,paragraphs};
  });
  return{prepared,replacements};
}

function replaceMarkerParagraph(xml,marker,replacement){
  const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=new RegExp(`<w:p>(?:(?!<w:p>).)*?<w:t[^>]*>${escaped}<\\/w:t>(?:(?!<w:p>).)*?<\\/w:p>`,'s');
  return xml.replace(pattern,replacement);
}

export function buildDocxPartsWithTables(pages=[],title='Converted PDF',options={}){
  const mode=options.mode==='layout'?'layout':options.mode==='hybrid'?'hybrid':'editable';
  if(mode==='layout'||!pages.some(p=>p.tables?.length))return buildDocxParts(pages,title,{mode});
  const{prepared,replacements}=preparePages(pages,mode);const parts=buildDocxParts(prepared,title,{mode});
  let documentXml=parts['word/document.xml'];
  for(const item of replacements)documentXml=replaceMarkerParagraph(documentXml,item.marker,item.xml);
  parts['word/document.xml']=documentXml;return parts;
}

export{tableXml};
