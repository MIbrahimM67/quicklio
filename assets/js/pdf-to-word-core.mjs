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

function inferAlignment(line,pageWidth){
  if(!Number.isFinite(pageWidth)||pageWidth<=0)return'left';
  const width=Math.max(0,(line.xMax||0)-(line.xMin||0));
  const center=(Number(line.xMin)||0)+width/2;
  if(width<pageWidth*.88&&Math.abs(center-pageWidth/2)<=Math.max(8,pageWidth*.035))return'center';
  if((pageWidth-(Number(line.xMax)||0))<=Math.max(10,pageWidth*.06)&&(Number(line.xMin)||0)>pageWidth*.28)return'right';
  return'left';
}

export function linesToParagraphs(lines=[],pageWidth=612){
  if(!lines.length)return[];
  const baseFont=median(lines.map(l=>l.fontSize))||11;
  const baseLeft=Math.min(...lines.map(l=>Number(l.xMin)||0));
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
      current={
        text:line.text,fontSize:line.fontSize,bold:line.bold,italic:line.italic,heading,bullet,
        align:inferAlignment(line,pageWidth),leftIndentPt:Math.max(0,(Number(line.xMin)||0)-baseLeft),
        spaceAfterPt:Math.max(0,vertical-normalGap),lineCount:1
      };
      paragraphs.push(current);
    }else{
      current.text=joinWrapped(current.text,line.text);
      current.bold=current.bold&&line.bold;
      current.italic=current.italic&&line.italic;
      current.fontSize=Math.max(current.fontSize,line.fontSize);
      current.lineCount++;
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
    return cleaned?[{text:cleaned,fontSize:11,bold:false,italic:false,heading:false,bullet:false,align:'left',leftIndentPt:0,spaceAfterPt:0,lineCount:1}]:[];
  });
}

function twips(points,fallback=0){
  const n=Number(points);
  return Math.round((Number.isFinite(n)?n:fallback)*20);
}

function paragraphXml(p){
  const text=escapeXml(p.text);
  if(!text)return'';
  const size=Math.max(18,Math.min(56,Math.round((Number(p.fontSize)||11)*2)));
  const style=p.heading?'<w:pStyle w:val="Heading1"/>':'';
  const align=['center','right','both'].includes(p.align)?`<w:jc w:val="${p.align}"/>`:'';
  const indent=Number(p.leftIndentPt)>0?`<w:ind w:left="${Math.min(7200,twips(p.leftIndentPt))}"/>`:'';
  const after=Math.min(720,Math.max(0,twips(p.spaceAfterPt)));
  const spacing=`<w:spacing w:after="${after}"/>`;
  const runProps=[p.bold?'<w:b/>':'',p.italic?'<w:i/>':'',`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`].join('');
  return`<w:p><w:pPr>${style}${align}${indent}${spacing}</w:pPr><w:r><w:rPr>${runProps}</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

function sectionProps(page={},layout=false){
  const width=Math.max(1440,twips(page.widthPt,612));
  const height=Math.max(1440,twips(page.heightPt,792));
  const margin=layout?120:720;
  return`<w:sectPr><w:pgSz w:w="${width}" w:h="${height}"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
}

function pictureXml(page,index,{background=false}={}){
  const pageW=Math.max(72,Number(page.widthPt)||612),pageH=Math.max(72,Number(page.heightPt)||792);
  const sourceW=Math.max(1,Number(page.imagePixelWidth)||pageW),sourceH=Math.max(1,Number(page.imagePixelHeight)||pageH);
  const id=index+1,rel=escapeXml(page.imageRelId||`rIdImage${id}`),name=escapeXml(page.imageName||`page-${id}.png`);
  let widthPt,heightPt;
  if(background){widthPt=pageW;heightPt=pageH}else{
    const marginPt=6,availW=Math.max(36,pageW-marginPt*2),availH=Math.max(36,pageH-marginPt*2),scale=Math.min(availW/sourceW,availH/sourceH);
    widthPt=sourceW*scale;heightPt=sourceH*scale;
  }
  const cx=Math.max(1,Math.round(widthPt*12700)),cy=Math.max(1,Math.round(heightPt*12700));
  const pic=`<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
  if(background){
    return`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr><w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="0" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${1000+id}" name="PDF visual layer ${escapeXml(page.pageNumber||id)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>${pic}</wp:anchor></w:drawing></w:r></w:p>`;
  }
  return`<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="PDF page ${escapeXml(page.pageNumber||id)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>${pic}</wp:inline></w:drawing></w:r></w:p>`;
}

export function buildDocumentXml(pages=[],options={}){
  const mode=options.mode==='layout'?'layout':options.mode==='hybrid'?'hybrid':'editable';
  const body=[];
  pages.forEach((page,index)=>{
    if(page.label)body.push(`<w:p><w:pPr><w:pStyle w:val="PageLabel"/></w:pPr><w:r><w:t>${escapeXml(page.label)}</w:t></w:r></w:p>`);
    if(mode==='layout')body.push(pictureXml(page,index));
    else{
      if(mode==='hybrid'&&page.imageName)body.push(pictureXml(page,index,{background:true}));
      for(const p of page.paragraphs||[])body.push(paragraphXml(p));
    }
    if(index<pages.length-1)body.push(`<w:p><w:pPr>${sectionProps(page,mode==='layout')}</w:pPr></w:p>`);
  });
  const last=pages.at(-1)||{};
  body.push(sectionProps(last,mode==='layout'));
  return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body.join('')}</w:body></w:document>`;
}

export function buildDocxParts(pages=[],title='Converted PDF',options={}){
  const mode=options.mode==='layout'?'layout':options.mode==='hybrid'?'hybrid':'editable';
  const now=new Date().toISOString();
  const imagePages=pages.filter(p=>p.imageName);
  const imageDefaults=imagePages.length?'<Default Extension="png" ContentType="image/png"/>':'';
  const imageRels=imagePages.map((p,i)=>`<Relationship Id="${escapeXml(p.imageRelId||`rIdImage${i+1}`)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${escapeXml(p.imageName||`page-${i+1}.png`)}"/>`).join('');
  return{
    '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imageDefaults}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    '_rels/.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    'word/document.xml':buildDocumentXml(pages,{mode}),
    'word/styles.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="PageLabel"><w:name w:val="Page label"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="777777"/><w:i/><w:sz w:val="18"/></w:rPr></w:style></w:styles>`,
    'word/_rels/document.xml.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${imageRels}</Relationships>`,
    'docProps/core.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>Quicklio</dc:creator><cp:lastModifiedBy>Quicklio</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`,
    'docProps/app.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Quicklio</Application></Properties>`
  };
}