export function median(values){
  const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);
  if(!a.length)return 0;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}

export function escapeXml(value){
  return String(value??'')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function itemFontSize(item){
  const t=item?.transform||[];
  const a=Number(t[0]),b=Number(t[1]),d=Number(t[3]);
  const byMatrix=Number.isFinite(a)&&Number.isFinite(b)?Math.hypot(a,b):Math.abs(d);
  const h=Math.abs(Number(item?.height));
  return Math.max(1,byMatrix||h||10);
}

function fontFlags(name=''){
  const s=String(name);
  return{bold:/bold|black|semibold|demi/i.test(s),italic:/italic|oblique/i.test(s)};
}

export function textItemsToLines(items=[]){
  const clean=items.filter(i=>i&&String(i.str??'').trim()).map((item,index)=>{
    const t=item.transform||[];
    const flags=fontFlags(item.fontName);
    return{
      index,text:String(item.str),x:Number(t[4])||0,y:Number(t[5])||0,
      width:Math.max(0,Number(item.width)||0),fontSize:itemFontSize(item),
      bold:flags.bold,italic:flags.italic
    };
  }).sort((a,b)=>Math.abs(b.y-a.y)>1?b.y-a.y:a.x-b.x);

  const lines=[];
  for(const item of clean){
    const last=lines.at(-1);
    const tolerance=Math.max(2,Math.min(item.fontSize,last?.fontSize||item.fontSize)*0.42);
    if(last&&Math.abs(last.y-item.y)<=tolerance){
      last.items.push(item);
      last.y=(last.y*(last.items.length-1)+item.y)/last.items.length;
      last.fontSize=Math.max(last.fontSize,item.fontSize);
    }else lines.push({y:item.y,fontSize:item.fontSize,items:[item]});
  }

  return lines.map(line=>{
    const sorted=line.items.sort((a,b)=>a.x-b.x);
    let text='',prevEnd=null,wideGaps=0,boldWeight=0,italicWeight=0,totalWeight=0;
    for(const item of sorted){
      if(prevEnd!==null){
        const gap=item.x-prevEnd;
        const charWidth=item.width/Math.max(1,item.text.length)||item.fontSize*.45;
        if(gap>Math.max(1.5,charWidth*.55)&&!text.endsWith(' ')&&!item.text.startsWith(' '))text+=' ';
        if(gap>Math.max(item.fontSize*1.8,charWidth*4))wideGaps++;
      }
      text+=item.text;
      prevEnd=item.x+item.width;
      const w=Math.max(1,item.text.trim().length);
      totalWeight+=w;if(item.bold)boldWeight+=w;if(item.italic)italicWeight+=w;
    }
    return{
      text:text.replace(/\s+/g,' ').trim(),y:line.y,fontSize:median(sorted.map(x=>x.fontSize))||line.fontSize,
      xMin:Math.min(...sorted.map(x=>x.x)),xMax:Math.max(...sorted.map(x=>x.x+x.width)),wideGaps,
      bold:boldWeight>totalWeight*.5,italic:italicWeight>totalWeight*.5
    };
  }).filter(l=>l.text);
}

function joinWrapped(a,b){
  if(/\p{L}-$/u.test(a)&&/^\p{Ll}/u.test(b))return a.slice(0,-1)+b;
  return a+' '+b;
}

export function linesToParagraphs(lines=[]){
  if(!lines.length)return[];
  const baseFont=median(lines.map(l=>l.fontSize))||11;
  const gaps=[];
  for(let i=1;i<lines.length;i++){
    const g=lines[i-1].y-lines[i].y;
    if(g>0&&g<baseFont*5)gaps.push(g);
  }
  const compactGaps=gaps.filter(g=>g<=baseFont*1.8);
  const normalGap=median(compactGaps)||median(gaps)||baseFont*1.15;
  const paragraphs=[];
  let current=null;
  for(let i=0;i<lines.length;i++){
    const line=lines[i],prev=lines[i-1];
    const heading=line.fontSize>=baseFont*1.38&&line.text.length<=140;
    const bullet=/^(?:[•●▪◦‣⁃]|[-–—]\s|\d+[.)]\s|[A-Za-z][.)]\s)/u.test(line.text);
    const vertical=prev?prev.y-line.y:0;
    const indentJump=prev?Math.abs(line.xMin-prev.xMin)>baseFont*2.5:false;
    const newPara=!current||heading||current.heading||bullet||vertical>Math.max(normalGap*1.55,baseFont*1.65)||indentJump;
    if(newPara){
      current={text:line.text,fontSize:line.fontSize,bold:line.bold,italic:line.italic,heading,bullet};
      paragraphs.push(current);
    }else{
      current.text=joinWrapped(current.text,line.text);
      current.bold=current.bold&&line.bold;
      current.italic=current.italic&&line.italic;
      current.fontSize=Math.max(current.fontSize,line.fontSize);
    }
  }
  return paragraphs;
}

export function analyzeTextPage(lines=[],pageWidth=612){
  const charCount=lines.reduce((n,l)=>n+l.text.replace(/\s/g,'').length,0);
  const scannedLikely=charCount<20;
  const wideGapLines=lines.filter(l=>l.wideGaps>0).length;
  const leftLines=lines.filter(l=>l.xMin<pageWidth*.18).length;
  const rightStartLines=lines.filter(l=>l.xMin>pageWidth*.38).length;
  const complexLayout=!scannedLikely&&lines.length>=6&&(
    wideGapLines>=Math.max(3,Math.ceil(lines.length*.18))||
    (leftLines>=Math.ceil(lines.length*.25)&&rightStartLines>=Math.ceil(lines.length*.2))
  );
  return{charCount,lineCount:lines.length,scannedLikely,complexLayout,wideGapLines};
}

export function ocrTextToParagraphs(text=''){
  return String(text).replace(/\r/g,'').split(/\n\s*\n+/).flatMap(block=>{
    const cleaned=block.split('\n').map(s=>s.trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    return cleaned?[{text:cleaned,fontSize:11,bold:false,italic:false,heading:false,bullet:false}]:[];
  });
}

function paragraphXml(p){
  const text=escapeXml(p.text);
  if(!text)return'';
  const size=Math.max(18,Math.min(44,Math.round((Number(p.fontSize)||11)*2)));
  const style=p.heading?'<w:pStyle w:val="Heading1"/>':'';
  const runProps=[p.bold?'<w:b/>':'',p.italic?'<w:i/>':'',`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`].join('');
  return`<w:p><w:pPr>${style}</w:pPr><w:r><w:rPr>${runProps}</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

export function buildDocumentXml(pages=[]){
  const body=[];
  pages.forEach((page,index)=>{
    if(page.label)body.push(`<w:p><w:pPr><w:pStyle w:val="PageLabel"/></w:pPr><w:r><w:t>${escapeXml(page.label)}</w:t></w:r></w:p>`);
    for(const p of page.paragraphs||[])body.push(paragraphXml(p));
    if(index<pages.length-1)body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  });
  return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

export function buildDocxParts(pages=[],title='Converted PDF'){
  const now=new Date().toISOString();
  return{
    '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    '_rels/.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    'word/document.xml':buildDocumentXml(pages),
    'word/styles.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="PageLabel"><w:name w:val="Page label"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="777777"/><w:i/><w:sz w:val="18"/></w:rPr></w:style></w:styles>`,
    'word/_rels/document.xml.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'docProps/core.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>Quicklio</dc:creator><cp:lastModifiedBy>Quicklio</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`,
    'docProps/app.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Quicklio</Application></Properties>`
  };
}
