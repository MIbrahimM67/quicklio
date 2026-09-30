const median=values=>{const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function normalizeFontFamily(value='',fallbackName=''){
  const raw=String(value||fallbackName||'').trim();
  let first=raw.split(',')[0].trim().replace(/^["']|["']$/g,'').replace(/^[A-Z]{6}\+/,'');
  const probe=(first||raw).toLowerCase();
  if(/helvetica|arial|liberation sans|nimbus sans|sans-serif/.test(probe))return'Arial';
  if(/times|liberation serif|nimbus roman|serif/.test(probe))return'Times New Roman';
  if(/courier|liberation mono|nimbus mono|monospace/.test(probe))return'Courier New';
  if(/carlito|calibri/.test(probe))return'Calibri';
  if(/cambria/.test(probe))return'Cambria';
  if(/georgia/.test(probe))return'Georgia';
  if(/verdana/.test(probe))return'Verdana';
  if(/tahoma/.test(probe))return'Tahoma';
  if(!first||/^(sans-serif|serif|monospace|cursive|fantasy|system-ui)$/i.test(first))return'Arial';
  return first.slice(0,80);
}

function itemFontSize(item){
  const t=item?.transform||[];const a=Number(t[0]),b=Number(t[1]),d=Number(t[3]);
  const byMatrix=Number.isFinite(a)&&Number.isFinite(b)?Math.hypot(a,b):Math.abs(d),h=Math.abs(Number(item?.height));
  return Math.max(1,byMatrix||h||10);
}
function fontFlags(name=''){const s=String(name);return{bold:/bold|black|semibold|demi/i.test(s),italic:/italic|oblique/i.test(s)}}
function angleDeg(item){const t=item?.transform||[];const a=Number(t[0]),b=Number(t[1]);if(!Number.isFinite(a)||!Number.isFinite(b))return 0;let angle=Math.atan2(b,a)*180/Math.PI;while(angle>180)angle-=360;while(angle<=-180)angle+=360;return angle}
function charWidth(item){return Math.max(1,Number(item.width)||0)/Math.max(1,String(item.text||'').length)||Math.max(2,(Number(item.fontSize)||10)*.45)}
function sameRunStyle(a,b){return!!a&&!!b&&a.bold===b.bold&&a.italic===b.italic&&a.rtl===b.rtl&&a.vertAlign===b.vertAlign&&a.href===b.href&&String(a.fontFamily||'')===String(b.fontFamily||'')&&Math.abs((a.fontSize||0)-(b.fontSize||0))<.35}
function pushRun(runs,run){if(!run?.text)return;const last=runs.at(-1),positioned=Number.isFinite(Number(run.xStart))||Number.isFinite(Number(last?.xStart));if(last&&!positioned&&sameRunStyle(last,run))last.text+=run.text;else runs.push({...run})}
function horizontalGap(a,b){return Math.max(0,Math.max((a.x||0)-((b.x||0)+(b.width||0)),(b.x||0)-((a.x||0)+(a.width||0))))}

function annotateScripts(items){
  for(const item of items){
    let best=null,bestScore=Infinity;
    for(const candidate of items){
      if(candidate===item||candidate.vertical||item.vertical)continue;
      if(candidate.fontSize<item.fontSize*1.18)continue;
      const gap=horizontalGap(item,candidate),dy=item.y-candidate.y;
      if(gap>Math.max(24,candidate.fontSize*2.2)||Math.abs(dy)>candidate.fontSize*.95||Math.abs(dy)<candidate.fontSize*.16)continue;
      const score=gap+Math.abs(dy)*.4;
      if(score<bestScore){best=candidate;bestScore=score;}
    }
    if(best){item.vertAlign=item.y>best.y?'superscript':'subscript';item.scriptBaseY=best.y;}
  }
}

function splitBaselineItems(items,pageWidth=0){
  if(items.length<2)return[items];const groups=[];let current=[],prev=null;
  for(const item of items){
    if(prev){const gap=item.x-(prev.x+prev.width),font=Math.max(1,Math.min(prev.fontSize||10,item.fontSize||10)),cw=Math.max(charWidth(prev),charWidth(item)),threshold=Math.max(18,font*2.4,cw*5,Number(pageWidth)>0?Number(pageWidth)*.035:0);if(gap>threshold&&current.length){groups.push(current);current=[];}}
    current.push(item);prev=item;
  }
  if(current.length)groups.push(current);return groups;
}

function makeLine(items,y,fontSize,columnSplit=false){
  const sorted=items.slice().sort((a,b)=>a.x-b.x);let text='',prevEnd=null,wideGaps=0,boldWeight=0,italicWeight=0,rtlWeight=0,totalWeight=0;const runs=[];
  for(const item of sorted){
    let prefix='';if(prevEnd!==null){const gap=item.x-prevEnd,cw=charWidth(item);if(gap>Math.max(1.5,cw*.55)&&!text.endsWith(' ')&&!item.text.startsWith(' '))prefix=' ';if(gap>Math.max(item.fontSize*1.8,cw*4))wideGaps++;}
    const piece=prefix+item.text;text+=piece;prevEnd=item.x+item.width;const w=Math.max(1,item.text.trim().length);totalWeight+=w;if(item.bold)boldWeight+=w;if(item.italic)italicWeight+=w;if(item.rtl)rtlWeight+=w;
    pushRun(runs,{text:piece,fontSize:item.fontSize,bold:item.bold,italic:item.italic,fontFamily:item.fontFamily,rtl:item.rtl,vertAlign:item.vertAlign||'',rotationDeg:item.rotationDeg||0,xStart:item.x,xEnd:item.x+item.width});
  }
  return{text:text.replace(/\s+/g,' ').trim(),y,fontSize:median(sorted.map(x=>x.fontSize))||fontSize,xMin:Math.min(...sorted.map(x=>x.x)),xMax:Math.max(...sorted.map(x=>x.x+x.width)),wideGaps,bold:boldWeight>totalWeight*.5,italic:italicWeight>totalWeight*.5,rtl:rtlWeight>totalWeight*.5,ascent:median(sorted.map(x=>x.ascent).filter(Number.isFinite))||.82,runs,columnSplit,hardBreak:sorted.some(x=>x.hasEOL),vertical:sorted.some(x=>x.vertical),rotationDeg:median(sorted.map(x=>x.rotationDeg).filter(Number.isFinite))||0,boxHeightPt:Math.max(...sorted.map(x=>x.fontSize||10))};
}

export function textItemsToFidelityLines(items=[],pageWidth=0,styles={}){
  const clean=items.filter(i=>i&&String(i.str??'').trim()).map((item,index)=>{const t=item.transform||[],flags=fontFlags(item.fontName),style=styles?.[item.fontName]||{},rotationDeg=angleDeg(item),fontSize=itemFontSize(item);return{index,text:String(item.str),x:Number(t[4])||0,y:Number(t[5])||0,width:Math.max(0,Number(item.width)||0),fontSize,bold:flags.bold,italic:flags.italic,fontFamily:normalizeFontFamily(style.fontFamily,item.fontName),rtl:item.dir==='rtl',vertical:item.dir==='ttb'||style.vertical===true||Math.abs(Math.abs(rotationDeg)-90)<12,rotationDeg,ascent:Number.isFinite(Number(style.ascent))?clamp(Number(style.ascent),.1,1.5):.82,hasEOL:item.hasEOL===true};});
  annotateScripts(clean);clean.sort((a,b)=>Math.abs((b.scriptBaseY??b.y)-(a.scriptBaseY??a.y))>1?(b.scriptBaseY??b.y)-(a.scriptBaseY??a.y):a.x-b.x);
  const baselines=[];
  for(const item of clean){const y=item.scriptBaseY??item.y,last=baselines.at(-1),tol=Math.max(2,Math.min(item.fontSize,last?.fontSize||item.fontSize)*.46);if(last&&Math.abs(last.y-y)<=tol&&last.vertical===item.vertical){last.items.push(item);last.y=(last.y*(last.items.length-1)+y)/last.items.length;last.fontSize=Math.max(last.fontSize,item.fontSize);}else baselines.push({y,fontSize:item.fontSize,vertical:item.vertical,items:[item]});}
  const lines=[];for(const baseline of baselines){const groups=splitBaselineItems(baseline.items.slice().sort((a,b)=>a.x-b.x),pageWidth);for(const group of groups)lines.push(makeLine(group,baseline.y,baseline.fontSize,groups.length>1));}
  return lines.filter(l=>l.text).sort((a,b)=>Math.abs(b.y-a.y)>1?b.y-a.y:a.xMin-b.xMin);
}

function safeHref(value=''){const v=String(value||'').trim();return/^(?:https?:|mailto:)/i.test(v)?v:''}
function rectOfAnnotation(annotation){const r=annotation?.rect;if(!Array.isArray(r)||r.length<4)return null;const x0=Math.min(Number(r[0])||0,Number(r[2])||0),x1=Math.max(Number(r[0])||0,Number(r[2])||0),y0=Math.min(Number(r[1])||0,Number(r[3])||0),y1=Math.max(Number(r[1])||0,Number(r[3])||0);return{x0,x1,y0,y1}}
export function applyLinksToLines(lines=[],annotations=[]){
  const links=(Array.isArray(annotations)?annotations:[]).map(a=>({href:safeHref(a?.url||a?.unsafeUrl),rect:rectOfAnnotation(a)})).filter(x=>x.href&&x.rect);
  let matched=0;
  for(const line of lines){const top=line.y+(line.fontSize||11)*.35,bottom=line.y-(line.fontSize||11)*.9;for(const link of links){const vOverlap=Math.max(0,Math.min(top,link.rect.y1)-Math.max(bottom,link.rect.y0));if(vOverlap<=0)continue;let lineHit=false;for(const run of line.runs||[]){const rx0=Number(run.xStart)||line.xMin,rx1=Number(run.xEnd)||line.xMax,overlap=Math.max(0,Math.min(rx1,link.rect.x1)-Math.max(rx0,link.rect.x0)),width=Math.max(1,rx1-rx0);if(overlap/width>=.45){run.href=link.href;lineHit=true;}}if(lineHit){line.href=link.href;matched++;break;}}}
  return matched;
}

export function restoreFidelityParagraphRuns(paragraphs=[]){
  for(const p of paragraphs){
    if(Array.isArray(p.layoutRunLines)&&p.layoutRunLines.length){const runs=[];p.layoutRunLines.forEach((lineRuns,i)=>{if(i)runs.push({text:' ',fontSize:p.fontSize||11,bold:false,italic:false,rtl:p.rtl||false});for(const r of lineRuns)runs.push({...r});});p.runs=runs;}
  }
  return paragraphs;
}

export function enrichParagraphOrientation(paragraphs=[],lines=[]){
  for(const p of paragraphs){const y=Number(p.layoutFirstBaselinePt),x=Number(p.layoutXPt);if(!Number.isFinite(y))continue;let best=null,bestScore=Infinity;for(const line of lines){const score=Math.abs((Number(line.y)||0)-y)+Math.abs((Number(line.xMin)||0)-(Number.isFinite(x)?x:0))*.05;if(score<bestScore){best=line;bestScore=score;}}if(best&&bestScore<Math.max(12,(best.fontSize||11)*1.5)){p.rotationDeg=Number(best.rotationDeg)||0;p.vertical=!!best.vertical;if(p.vertical)p.verticalDirection=p.rotationDeg<0?'btLr':'tbRl';}}
  return paragraphs;
}

export function positionedParagraphsToLines(paragraphs=[]){
  return paragraphs.filter(p=>Number.isFinite(Number(p.layoutFirstBaselinePt))&&String(p.text||'').trim()).map((p,index)=>({text:String(p.text),y:Number(p.layoutFirstBaselinePt),xMin:Number(p.layoutXPt)||0,xMax:Number(p.layoutRightPt)||((Number(p.layoutXPt)||0)+(Number(p.layoutWidthPt)||12)),fontSize:Number(p.fontSize)||11,bold:!!p.bold,italic:!!p.italic,rtl:!!p.rtl,vertical:!!p.vertical,rotationDeg:Number(p.rotationDeg)||0,ascent:Number(p.ascent||p.fontAscent)||.82,runs:(p.runs||[]).map(r=>({...r})),wideGaps:0,columnSplit:false,hardBreak:true,boxHeightPt:Number(p.ocrBoxHeightPt)||Number(p.fontSize)||11,sourceParagraph:p,ocr:true,index}));
}

function repeatKey(text=''){return String(text).toLowerCase().replace(/\d+/g,'#').replace(/\s+/g,' ').trim()}
function dynamicPagePattern(text=''){const k=repeatKey(text);if(/^#$/i.test(k))return'page';if(/^page\s*#$/i.test(k))return'page';if(/^page\s*#\s*(?:of|\/)\s*#$/i.test(k))return'pageOfPages';return''}
export function detectRepeatingHeadersFooters(pages=[]){
  if(!Array.isArray(pages)||pages.length<2)return{header:null,footer:null,removed:0};
  const groups=new Map();
  for(const page of pages){const h=Math.max(72,Number(page.heightPt)||792);for(const p of page.paragraphs||[]){const y=Number(p.layoutFirstBaselinePt);if(!Number.isFinite(y)||!String(p.text||'').trim())continue;const zone=y>=h*.91?'header':y<=h*.09?'footer':'';if(!zone)continue;const key=zone+'|'+repeatKey(p.text);if(!groups.has(key))groups.set(key,{zone,keyText:repeatKey(p.text),items:[],pages:new Set()});const g=groups.get(key);g.items.push({page,p});g.pages.add(page.pageNumber??pages.indexOf(page));}}
  const threshold=Math.max(2,Math.ceil(pages.length*.6));const winners=[...groups.values()].filter(g=>g.pages.size>=threshold).sort((a,b)=>b.pages.size-a.pages.size||b.items.length-a.items.length);
  const descriptors={header:null,footer:null};let removed=0;
  for(const zone of['header','footer']){const selected=winners.filter(g=>g.zone===zone).slice(0,2);if(!selected.length)continue;const items=[];for(const g of selected){const sample=g.items[0].p,pattern=dynamicPagePattern(sample.text);items.push({text:sample.text,runs:(sample.runs||[]).map(r=>({...r})),align:sample.align||'center',dynamic:pattern});for(const entry of g.items){entry.page.paragraphs=entry.page.paragraphs.filter(p=>p!==entry.p);removed++;}}descriptors[zone]={items};}
  return{...descriptors,removed};
}

export function normalizeParagraphFonts(paragraphs=[]){for(const p of paragraphs){for(const run of p.runs||[])run.fontFamily=normalizeFontFamily(run.fontFamily);for(const line of p.layoutRunLines||[])for(const run of line)run.fontFamily=normalizeFontFamily(run.fontFamily);}return paragraphs}
