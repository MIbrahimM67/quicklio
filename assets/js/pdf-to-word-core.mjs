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

function cleanFontFamily(value=''){
  const first=String(value||'').split(',')[0].trim().replace(/^["']|["']$/g,'');
  if(!first||/^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(first))return'';
  return first.slice(0,80);
}

function sameRunStyle(a,b){
  return!!a&&!!b&&a.bold===b.bold&&a.italic===b.italic&&a.rtl===b.rtl&&
    String(a.fontFamily||'')===String(b.fontFamily||'')&&Math.abs((a.fontSize||0)-(b.fontSize||0))<.35;
}

function pushStyledRun(runs,run){
  if(!run?.text)return;
  const last=runs.at(-1);
  if(last&&sameRunStyle(last,run))last.text+=run.text;
  else runs.push({...run});
}

function itemCharWidth(item){
  return Math.max(1,Number(item.width)||0)/Math.max(1,String(item.text||'').length)||Math.max(2,(Number(item.fontSize)||10)*.45);
}

function splitBaselineItems(items,pageWidth=0){
  if(items.length<2)return[items];
  const groups=[];let current=[];let prev=null;
  for(const item of items){
    if(prev){
      const gap=item.x-(prev.x+prev.width);
      const font=Math.max(1,Math.min(prev.fontSize||10,item.fontSize||10));
      const char=Math.max(itemCharWidth(prev),itemCharWidth(item));
      const threshold=Math.max(18,font*2.4,char*5,Number(pageWidth)>0?Number(pageWidth)*.035:0);
      if(gap>threshold&&current.length){groups.push(current);current=[];}
    }
    current.push(item);prev=item;
  }
  if(current.length)groups.push(current);
  return groups;
}

function makeLine(items,y,fontSize,columnSplit=false){
  const sorted=items.slice().sort((a,b)=>a.x-b.x);
  let text='',prevEnd=null,wideGaps=0,boldWeight=0,italicWeight=0,rtlWeight=0,totalWeight=0;
  const runs=[];
  for(const item of sorted){
    let prefix='';
    if(prevEnd!==null){
      const gap=item.x-prevEnd;
      const charWidth=itemCharWidth(item);
      if(gap>Math.max(1.5,charWidth*.55)&&!text.endsWith(' ')&&!item.text.startsWith(' '))prefix=' ';
      if(gap>Math.max(item.fontSize*1.8,charWidth*4))wideGaps++;
    }
    const piece=prefix+item.text;
    text+=piece;prevEnd=item.x+item.width;
    const w=Math.max(1,item.text.trim().length);totalWeight+=w;
    if(item.bold)boldWeight+=w;if(item.italic)italicWeight+=w;if(item.rtl)rtlWeight+=w;
    pushStyledRun(runs,{text:piece,fontSize:item.fontSize,bold:item.bold,italic:item.italic,fontFamily:item.fontFamily,rtl:item.rtl});
  }
  return{
    text:text.replace(/\s+/g,' ').trim(),y,fontSize:median(sorted.map(x=>x.fontSize))||fontSize,
    xMin:Math.min(...sorted.map(x=>x.x)),xMax:Math.max(...sorted.map(x=>x.x+x.width)),wideGaps,
    bold:boldWeight>totalWeight*.5,italic:italicWeight>totalWeight*.5,rtl:rtlWeight>totalWeight*.5,
    ascent:median(sorted.map(x=>x.ascent).filter(Number.isFinite))||.82,
    runs,columnSplit,hardBreak:sorted.some(x=>x.hasEOL),vertical:sorted.some(x=>x.vertical)
  };
}

export function textItemsToLines(items=[],pageWidth=0,styles={}){
  const clean=items.filter(i=>i&&String(i.str??'').trim()).map((item,index)=>{
    const t=item.transform||[];const flags=fontFlags(item.fontName);const style=styles?.[item.fontName]||{};
    return{
      index,text:String(item.str),x:Number(t[4])||0,y:Number(t[5])||0,width:Math.max(0,Number(item.width)||0),
      fontSize:itemFontSize(item),bold:flags.bold,italic:flags.italic,fontFamily:cleanFontFamily(style.fontFamily),
      rtl:item.dir==='rtl',vertical:item.dir==='ttb'||style.vertical===true,
      ascent:Number.isFinite(Number(style.ascent))?Math.max(.1,Math.min(1.5,Number(style.ascent))):.82,
      hasEOL:item.hasEOL===true
    };
  }).sort((a,b)=>Math.abs(b.y-a.y)>1?b.y-a.y:a.x-b.x);

  const baselines=[];
  for(const item of clean){
    const last=baselines.at(-1);const tolerance=Math.max(2,Math.min(item.fontSize,last?.fontSize||item.fontSize)*.42);
    if(last&&Math.abs(last.y-item.y)<=tolerance&&last.vertical===item.vertical){
      last.items.push(item);last.y=(last.y*(last.items.length-1)+item.y)/last.items.length;last.fontSize=Math.max(last.fontSize,item.fontSize);
    }else baselines.push({y:item.y,fontSize:item.fontSize,vertical:item.vertical,items:[item]});
  }

  const lines=[];
  for(const baseline of baselines){
    const groups=splitBaselineItems(baseline.items.slice().sort((a,b)=>a.x-b.x),pageWidth);
    for(const group of groups)lines.push(makeLine(group,baseline.y,baseline.fontSize,groups.length>1));
  }
  return lines.filter(l=>l.text).sort((a,b)=>Math.abs(b.y-a.y)>1?b.y-a.y:a.xMin-b.xMin);
}

function joinWrapped(a,b){
  if(/\p{L}-$/u.test(a)&&/^\p{Ll}/u.test(b))return a.slice(0,-1)+b;
  return a+' '+b;
}

function inferAlignment(line,pageWidth){
  if(!Number.isFinite(pageWidth)||pageWidth<=0)return line.rtl?'right':'left';
  const width=Math.max(0,(line.xMax||0)-(line.xMin||0));const center=(Number(line.xMin)||0)+width/2;
  if(width<pageWidth*.88&&Math.abs(center-pageWidth/2)<=Math.max(8,pageWidth*.035))return'center';
  if((pageWidth-(Number(line.xMax)||0))<=Math.max(10,pageWidth*.06)&&(Number(line.xMin)||0)>pageWidth*.28)return'right';
  return line.rtl?'right':'left';
}

function addLayoutHints(target,line){
  const xMin=Number(line.xMin)||0,xMax=Number(line.xMax)||xMin,y=Number(line.y)||0;
  if(!Array.isArray(target.layoutLines))target.layoutLines=[];
  if(!Array.isArray(target.layoutRunLines))target.layoutRunLines=[];
  target.layoutLines.push(line.text);target.layoutRunLines.push((line.runs||[{text:line.text,fontSize:line.fontSize,bold:line.bold,italic:line.italic,fontFamily:line.fontFamily,rtl:line.rtl}]).map(r=>({...r})));
  target.layoutXPt=Number.isFinite(target.layoutXPt)?Math.min(target.layoutXPt,xMin):xMin;
  target.layoutRightPt=Number.isFinite(target.layoutRightPt)?Math.max(target.layoutRightPt,xMax):xMax;
  target.layoutFirstBaselinePt=Number.isFinite(target.layoutFirstBaselinePt)?Math.max(target.layoutFirstBaselinePt,y):y;
  target.layoutLastBaselinePt=Number.isFinite(target.layoutLastBaselinePt)?Math.min(target.layoutLastBaselinePt,y):y;
  target.ascent=Math.max(Number(target.ascent)||0,Number(line.ascent)||0);
}

function appendFlowRuns(target,line,hyphenated=false){
  if(!Array.isArray(target.runs))target.runs=[];
  const source=(line.runs||[{text:line.text,fontSize:line.fontSize,bold:line.bold,italic:line.italic,rtl:line.rtl}]).map(r=>({...r}));
  if(!target.runs.length){for(const r of source)pushStyledRun(target.runs,r);return;}
  if(hyphenated){const last=target.runs.at(-1);if(last?.text?.endsWith('-'))last.text=last.text.slice(0,-1);}
  else pushStyledRun(target.runs,{text:' ',fontSize:line.fontSize,bold:false,italic:false,rtl:line.rtl});
  for(const r of source)pushStyledRun(target.runs,r);
}

function columnReadingOrder(lines,pageWidth){
  const ordered=lines.slice();
  if(!Number.isFinite(pageWidth)||pageWidth<=0||ordered.length<8)return ordered;
  const left=ordered.filter(l=>!l.vertical&&l.xMin<pageWidth*.42&&l.xMax<pageWidth*.58);
  const right=ordered.filter(l=>!l.vertical&&l.xMin>pageWidth*.42&&l.xMax<=pageWidth*.98);
  if(left.length<3||right.length<3)return ordered;
  const leftTop=Math.max(...left.map(l=>l.y)),leftBottom=Math.min(...left.map(l=>l.y));
  const rightTop=Math.max(...right.map(l=>l.y)),rightBottom=Math.min(...right.map(l=>l.y));
  const bodyTop=Math.min(leftTop,rightTop),bodyBottom=Math.max(leftBottom,rightBottom);
  if(bodyTop-bodyBottom<40)return ordered;
  const spanners=ordered.filter(l=>((l.xMax-l.xMin)>pageWidth*.56)||(l.xMin<pageWidth*.34&&l.xMax>pageWidth*.66));
  if(spanners.some(l=>l.y<bodyTop-3&&l.y>bodyBottom+3))return ordered;
  const leftSet=new Set(left),rightSet=new Set(right);
  const unclassified=ordered.filter(l=>!leftSet.has(l)&&!rightSet.has(l)&&!spanners.includes(l)&&l.y<=bodyTop+3&&l.y>=bodyBottom-3);
  if(unclassified.length)return ordered;
  for(const l of left)l.columnId='left';
  for(const l of right)l.columnId='right';
  const headers=ordered.filter(l=>!leftSet.has(l)&&!rightSet.has(l)&&l.y>bodyTop+3).sort((a,b)=>b.y-a.y||a.xMin-b.xMin);
  const footers=ordered.filter(l=>!leftSet.has(l)&&!rightSet.has(l)&&l.y<bodyBottom-3).sort((a,b)=>b.y-a.y||a.xMin-b.xMin);
  return[...headers,...left.slice().sort((a,b)=>b.y-a.y||a.xMin-b.xMin),...right.slice().sort((a,b)=>b.y-a.y||a.xMin-b.xMin),...footers];
}

function shouldContinueParagraph(current,line,prev,baseFont,normalGap){
  if(!current||!prev)return false;
  if((line.columnId||prev.columnId)&&line.columnId!==prev.columnId)return false;
  if((line.columnSplit||prev.columnSplit)&&!(line.columnId&&line.columnId===prev.columnId))return false;
  if(line.vertical!==prev.vertical||line.rtl!==prev.rtl)return false;
  const vertical=prev.y-line.y;
  const heading=line.fontSize>=baseFont*1.38&&line.text.length<=140;
  const bullet=/^(?:[•●▪◦‣⁃]|[-–—]\s|\d+[.)]\s|[A-Za-z][.)]\s)/u.test(line.text);
  const indentJump=Math.abs(line.xMin-prev.xMin)>baseFont*2.5;
  return!heading&&!current.heading&&!bullet&&vertical<=Math.max(normalGap*1.55,baseFont*1.65)&&!indentJump;
}

export function linesToParagraphs(lines=[],pageWidth=612){
  if(!lines.length)return[];
  const ordered=columnReadingOrder(lines,pageWidth);
  const baseFont=median(ordered.map(l=>l.fontSize))||11;const baseLeft=Math.min(...ordered.map(l=>Number(l.xMin)||0));
  const gaps=[];
  for(let i=1;i<ordered.length;i++){const g=ordered[i-1].y-ordered[i].y;if(g>0&&g<baseFont*5)gaps.push(g);}
  const compactGaps=gaps.filter(g=>g<=baseFont*1.8);const normalGap=median(compactGaps)||median(gaps)||baseFont*1.15;
  const paragraphs=[];let current=null,prev=null;
  for(const line of ordered){
    const heading=line.fontSize>=baseFont*1.38&&line.text.length<=140;
    const bullet=/^(?:[•●▪◦‣⁃]|[-–—]\s|\d+[.)]\s|[A-Za-z][.)]\s)/u.test(line.text);
    const vertical=prev?prev.y-line.y:0;
    const continueCurrent=shouldContinueParagraph(current,line,prev,baseFont,normalGap);
    if(!continueCurrent){
      current={
        text:line.text,fontSize:line.fontSize,bold:line.bold,italic:line.italic,rtl:line.rtl,vertical:line.vertical,
        heading,bullet,align:inferAlignment(line,pageWidth),leftIndentPt:Math.max(0,(Number(line.xMin)||0)-baseLeft),
        spaceAfterPt:Math.max(0,vertical-normalGap),lineCount:1,runs:[],ascent:Number(line.ascent)||.82,columnId:line.columnId||''
      };
      appendFlowRuns(current,line);addLayoutHints(current,line);paragraphs.push(current);
    }else{
      const hyphenated=/\p{L}-$/u.test(current.text)&&/^\p{Ll}/u.test(line.text);
      current.text=joinWrapped(current.text,line.text);current.bold=current.bold&&line.bold;current.italic=current.italic&&line.italic;
      current.fontSize=Math.max(current.fontSize,line.fontSize);current.lineCount++;
      appendFlowRuns(current,line,hyphenated);addLayoutHints(current,line);
    }
    prev=line;
  }
  return paragraphs.map(p=>({...p,layoutText:(p.layoutLines||[p.text]).join('\n'),layoutWidthPt:Math.max(12,(Number(p.layoutRightPt)||0)-(Number(p.layoutXPt)||0))}));
}

export function analyzeTextPage(lines=[],pageWidth=612){
  const charCount=lines.reduce((n,l)=>n+l.text.replace(/\s/g,'').length,0);const scannedLikely=charCount<20;
  const wideGapLines=lines.filter(l=>l.wideGaps>0||l.columnSplit).length;const leftLines=lines.filter(l=>l.xMin<pageWidth*.18).length;const rightStartLines=lines.filter(l=>l.xMin>pageWidth*.38).length;
  const verticalLines=lines.filter(l=>l.vertical).length,rtlLines=lines.filter(l=>l.rtl).length;
  const complexLayout=!scannedLikely&&lines.length>=6&&(wideGapLines>=Math.max(3,Math.ceil(lines.length*.18))||(leftLines>=Math.ceil(lines.length*.25)&&rightStartLines>=Math.ceil(lines.length*.2))||verticalLines>0);
  return{charCount,lineCount:lines.length,scannedLikely,complexLayout,wideGapLines,verticalLines,rtlLines};
}

export function ocrTextToParagraphs(text=''){
  return String(text).replace(/\r/g,'').split(/\n\s*\n+/).flatMap(block=>{
    const cleaned=block.split('\n').map(s=>s.trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    return cleaned?[{text:cleaned,fontSize:11,bold:false,italic:false,rtl:false,heading:false,bullet:false,align:'left',leftIndentPt:0,spaceAfterPt:0,lineCount:1,runs:[{text:cleaned,fontSize:11,bold:false,italic:false,rtl:false}]}]:[];
  });
}

function twips(points,fallback=0){const n=Number(points);return Math.round((Number.isFinite(n)?n:fallback)*20);}
function sizeHalfPoints(fontSize){return Math.max(18,Math.min(96,Math.round((Number(fontSize)||11)*2)));}
function runPropsXml(run,fallback={}){
  const fontSize=Number(run?.fontSize)||Number(fallback.fontSize)||11;const bold=run?.bold??fallback.bold;const italic=run?.italic??fallback.italic;
  const family=cleanFontFamily(run?.fontFamily||fallback.fontFamily||'');const rtl=run?.rtl??fallback.rtl;
  const size=sizeHalfPoints(fontSize);
  return[
    family?`<w:rFonts w:ascii="${escapeXml(family)}" w:hAnsi="${escapeXml(family)}" w:cs="${escapeXml(family)}"/>`:'',
    bold?'<w:b/>':'',italic?'<w:i/>':'',rtl?'<w:rtl/>':'',`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`
  ].join('');
}
function styledRunsXml(runs=[],fallback={},lineBreakBefore=false){
  let out=lineBreakBefore?'<w:r><w:br/></w:r>':'';
  for(const run of runs){if(!String(run?.text??''))continue;out+=`<w:r><w:rPr>${runPropsXml(run,fallback)}</w:rPr><w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;}
  return out;
}
function paragraphXml(p){
  if(!String(p.text??'').trim())return'';const style=p.heading?'<w:pStyle w:val="Heading1"/>':'';const align=['center','right','both'].includes(p.align)?`<w:jc w:val="${p.align}"/>`:'';
  const bidi=p.rtl?'<w:bidi/>':'';
  const indent=Number(p.leftIndentPt)>0?`<w:ind w:left="${Math.min(7200,twips(p.leftIndentPt))}"/>`:'';const after=Math.min(720,Math.max(0,twips(p.spaceAfterPt)));const spacing=`<w:spacing w:after="${after}"/>`;
  const runs=Array.isArray(p.runs)&&p.runs.length?p.runs:[{text:p.text,fontSize:p.fontSize,bold:p.bold,italic:p.italic,rtl:p.rtl,fontFamily:p.fontFamily}];
  return`<w:p><w:pPr>${style}${bidi}${align}${indent}${spacing}</w:pPr>${styledRunsXml(runs,p)}</w:p>`;
}

function positionedParagraphXml(p,page={}){
  const text=String(p.layoutText??p.text??'');if(!text.trim())return'';
  const pageW=Math.max(72,Number(page.widthPt)||612),pageH=Math.max(72,Number(page.heightPt)||792),fontPt=Math.max(4,Number(p.fontSize)||11);
  const firstBaseline=Number(p.layoutFirstBaselinePt),lastBaseline=Number(p.layoutLastBaselinePt);if(!Number.isFinite(firstBaseline))return paragraphXml(p);
  const xPt=Math.max(0,Math.min(pageW-1,Number(p.layoutXPt)||0));const naturalWidth=Math.max(12,Number(p.layoutWidthPt)||pageW-xPt);const widthPt=Math.max(12,Math.min(pageW-xPt,naturalWidth+Math.max(3,fontPt*.35)));
  const ascent=Math.max(.1,Math.min(1.5,Number(p.ascent)||.82));
  const topPt=Math.max(0,Math.min(pageH-fontPt*.8,pageH-firstBaseline-fontPt*ascent));const lineCount=Math.max(1,Number(p.lineCount)||text.split('\n').length);
  const baselineSpan=Number.isFinite(lastBaseline)?Math.max(0,firstBaseline-lastBaseline):0;const observedLineGap=lineCount>1&&baselineSpan>0?baselineSpan/(lineCount-1):fontPt*1.15;
  const lineHeightPt=Math.max(fontPt*.92,Math.min(fontPt*1.8,observedLineGap||fontPt*1.15));const heightPt=Math.max(fontPt*1.2,baselineSpan+fontPt*1.28);
  const frame=`<w:framePr w:w="${Math.max(240,twips(widthPt))}" w:h="${Math.max(240,twips(heightPt))}" w:hRule="atLeast" w:wrap="notBeside" w:hAnchor="page" w:vAnchor="page" w:x="${twips(xPt)}" w:y="${twips(topPt)}" w:hSpace="0" w:vSpace="0" w:anchorLock="1"/>`;
  const spacing=`<w:spacing w:before="0" w:after="0" w:line="${Math.max(180,twips(lineHeightPt))}" w:lineRule="exact"/>`;
  const bidi=p.rtl?'<w:bidi/>':'';
  const lines=Array.isArray(p.layoutRunLines)&&p.layoutRunLines.length?p.layoutRunLines:null;
  const content=lines?lines.map((runs,i)=>styledRunsXml(runs,p,i>0)).join(''):styledRunsXml([{text,fontSize:p.fontSize,bold:p.bold,italic:p.italic,rtl:p.rtl,fontFamily:p.fontFamily}],p);
  return`<w:p><w:pPr>${frame}${bidi}${spacing}</w:pPr>${content}</w:p>`;
}

function sectionProps(page={},layout=false){
  const width=Math.max(1440,twips(page.widthPt,612)),height=Math.max(1440,twips(page.heightPt,792)),margin=layout?120:720;
  return`<w:sectPr><w:pgSz w:w="${width}" w:h="${height}"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
}

function pictureXml(page,index,{background=false}={}){
  const pageW=Math.max(72,Number(page.widthPt)||612),pageH=Math.max(72,Number(page.heightPt)||792);const sourceW=Math.max(1,Number(page.imagePixelWidth)||pageW),sourceH=Math.max(1,Number(page.imagePixelHeight)||pageH);
  const id=index+1,rel=escapeXml(page.imageRelId||`rIdImage${id}`),name=escapeXml(page.imageName||`page-${id}.png`);let widthPt,heightPt;
  if(background){widthPt=pageW;heightPt=pageH}else{const marginPt=6,availW=Math.max(36,pageW-marginPt*2),availH=Math.max(36,pageH-marginPt*2),scale=Math.min(availW/sourceW,availH/sourceH);widthPt=sourceW*scale;heightPt=sourceH*scale;}
  const cx=Math.max(1,Math.round(widthPt*12700)),cy=Math.max(1,Math.round(heightPt*12700));
  const pic=`<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
  if(background)return`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr><w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="0" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${1000+id}" name="PDF visual layer ${escapeXml(page.pageNumber||id)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>${pic}</wp:anchor></w:drawing></w:r></w:p>`;
  return`<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="PDF page ${escapeXml(page.pageNumber||id)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>${pic}</wp:inline></w:drawing></w:r></w:p>`;
}

export function buildDocumentXml(pages=[],options={}){
  const mode=options.mode==='layout'?'layout':options.mode==='hybrid'?'hybrid':'editable';const body=[];
  pages.forEach((page,index)=>{
    if(page.label)body.push(`<w:p><w:pPr><w:pStyle w:val="PageLabel"/></w:pPr><w:r><w:t>${escapeXml(page.label)}</w:t></w:r></w:p>`);
    if(mode==='layout')body.push(pictureXml(page,index));else{if(mode==='hybrid'&&page.imageName)body.push(pictureXml(page,index,{background:true}));for(const p of page.paragraphs||[])body.push(mode==='hybrid'?positionedParagraphXml(p,page):paragraphXml(p));}
    if(index<pages.length-1)body.push(`<w:p><w:pPr>${sectionProps(page,mode==='layout')}</w:pPr></w:p>`);
  });
  const last=pages.at(-1)||{};body.push(sectionProps(last,mode==='layout'));
  return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body.join('')}</w:body></w:document>`;
}

export function buildDocxParts(pages=[],title='Converted PDF',options={}){
  const mode=options.mode==='layout'?'layout':options.mode==='hybrid'?'hybrid':'editable';const now=new Date().toISOString();const imagePages=pages.filter(p=>p.imageName);
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
