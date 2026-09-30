const median=values=>{const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function groupRows(lines=[]){
  const sorted=lines.filter(l=>l&&String(l.text||'').trim()&&!l.vertical).slice().sort((a,b)=>Math.abs(b.y-a.y)>1?b.y-a.y:a.xMin-b.xMin);
  const rows=[];
  for(const line of sorted){
    const tol=Math.max(2,Math.min(6,(Number(line.fontSize)||11)*.38));
    let row=rows.find(r=>Math.abs(r.y-line.y)<=tol);
    if(!row){row={y:Number(line.y)||0,lines:[]};rows.push(row)}
    row.lines.push(line);row.y=median(row.lines.map(x=>Number(x.y)||0));
  }
  return rows.map(r=>({...r,lines:r.lines.slice().sort((a,b)=>(a.xMin||0)-(b.xMin||0))})).sort((a,b)=>b.y-a.y);
}

function clusterAnchors(values,tolerance){
  const clusters=[];
  for(const value of values.slice().sort((a,b)=>a-b)){
    let c=clusters.find(x=>Math.abs(x.center-value)<=tolerance);
    if(!c){c={values:[],center:value};clusters.push(c)}
    c.values.push(value);c.center=median(c.values);
  }
  return clusters.sort((a,b)=>a.center-b.center);
}

function segmentCandidateRows(rows,pageWidth){
  const out=[];let current=[];const minCols=2;
  const flush=()=>{if(current.length>=3)out.push(current);current=[]};
  let prevY=null;
  for(const row of rows){
    if(row.lines.length<minCols){flush();prevY=null;continue}
    const y=Number(row.y)||0;
    if(prevY!==null){const gap=prevY-y;const fonts=row.lines.map(l=>Number(l.fontSize)||11);const maxGap=Math.max(30,median(fonts)*2.8,pageWidth*.035);if(gap>maxGap){flush();}}
    current.push(row);prevY=y;
  }
  flush();return out;
}

function inferColumns(rows,pageWidth){
  const tol=Math.max(10,pageWidth*.022);
  const anchors=clusterAnchors(rows.flatMap(r=>r.lines.map(l=>Number(l.xMin)||0)),tol);
  const supported=anchors.filter(a=>{
    const support=rows.filter(r=>r.lines.some(l=>Math.abs((Number(l.xMin)||0)-a.center)<=tol)).length;
    a.support=support;return support>=Math.max(2,Math.ceil(rows.length*.66));
  });
  if(supported.length<2||supported.length>8)return null;
  return supported.map(a=>a.center).sort((a,b)=>a-b);
}

function assignRow(row,anchors,pageWidth){
  const tol=Math.max(14,pageWidth*.035);const cells=anchors.map(()=>[]);let misses=0;
  for(const line of row.lines){
    let best=-1,bestDist=Infinity;
    anchors.forEach((x,i)=>{const d=Math.abs((Number(line.xMin)||0)-x);if(d<bestDist){bestDist=d;best=i}});
    if(best<0||bestDist>tol){misses++;continue}
    cells[best].push(line);
  }
  return{cells,misses};
}

function cellFromLines(lines=[]){
  if(!lines.length)return{text:'',runs:[],bold:false,italic:false,rtl:false};
  const sorted=lines.slice().sort((a,b)=>Math.abs(b.y-a.y)>1?b.y-a.y:(a.xMin||0)-(b.xMin||0));
  const text=sorted.map(l=>l.text).join('\n');
  const runs=[];
  sorted.forEach((l,li)=>{
    if(li)runs.push({text:'\n',fontSize:l.fontSize||11,bold:false,italic:false,rtl:l.rtl||false});
    for(const r of l.runs||[{text:l.text,fontSize:l.fontSize,bold:l.bold,italic:l.italic,rtl:l.rtl,fontFamily:l.fontFamily}])runs.push({...r});
  });
  return{text,runs,bold:sorted.every(l=>l.bold),italic:sorted.every(l=>l.italic),rtl:sorted.filter(l=>l.rtl).length>sorted.length/2,fontSize:median(sorted.map(l=>Number(l.fontSize)||11))||11,sourceLines:sorted};
}

function buildTable(rows,anchors,pageWidth,pageHeight){
  const assigned=rows.map(r=>({row:r,...assignRow(r,anchors,pageWidth)}));
  const missCount=assigned.reduce((n,r)=>n+r.misses,0),totalLines=rows.reduce((n,r)=>n+r.lines.length,0);
  const coverage=1-missCount/Math.max(1,totalLines);
  const filled=assigned.reduce((n,r)=>n+r.cells.filter(c=>c.length).length,0)/(rows.length*anchors.length);
  const rowGaps=[];for(let i=1;i<rows.length;i++)rowGaps.push(rows[i-1].y-rows[i].y);
  const medGap=median(rowGaps)||14;const gapDeviation=rowGaps.length?median(rowGaps.map(g=>Math.abs(g-medGap))):0;
  const regularity=1-clamp(gapDeviation/Math.max(8,medGap),0,1);
  const confidence=clamp(.4*coverage+.35*filled+.25*regularity,0,1);
  if(confidence<.76)return null;
  const xEdges=[];
  for(let i=0;i<anchors.length;i++){
    const here=anchors[i],next=anchors[i+1];
    xEdges.push(i===0?Math.max(0,here-6):(anchors[i-1]+here)/2);
    if(i===anchors.length-1)xEdges.push(Math.min(pageWidth,Math.max(here+36,...rows.flatMap(r=>r.lines.filter(l=>Math.abs((l.xMin||0)-here)<=Math.max(14,pageWidth*.035)).map(l=>Number(l.xMax)||here+36)))));
    else if(next){} 
  }
  for(let i=1;i<anchors.length;i++)xEdges[i]=(anchors[i-1]+anchors[i])/2;
  const topBaseline=Math.max(...rows.map(r=>r.y)),bottomBaseline=Math.min(...rows.map(r=>r.y));
  const font=median(rows.flatMap(r=>r.lines.map(l=>Number(l.fontSize)||11)))||11;
  const topPt=Math.max(0,pageHeight-topBaseline-font*1.05),bottomPt=Math.min(pageHeight,pageHeight-bottomBaseline+font*.55);
  const tableRows=assigned.map(({cells,row})=>({y:row.y,cells:cells.map(cellFromLines)}));
  const sourceLines=rows.flatMap(r=>r.lines);
  return{
    rows:tableRows,columns:anchors.length,columnAnchors:anchors,columnWidthsPt:anchors.map((_,i)=>Math.max(24,xEdges[i+1]-xEdges[i])),
    xPt:xEdges[0],yTopPt:topPt,widthPt:xEdges.at(-1)-xEdges[0],heightPt:Math.max(font*1.5,bottomPt-topPt),
    confidence,sourceLines
  };
}

export function detectTables(lines=[],pageWidth=612,pageHeight=792){
  const rows=groupRows(lines);const groups=segmentCandidateRows(rows,pageWidth);const tables=[];
  for(const group of groups){
    const anchors=inferColumns(group,pageWidth);if(!anchors)continue;
    const table=buildTable(group,anchors,pageWidth,pageHeight);if(table)tables.push(table);
  }
  return tables;
}

export function tableSourceLineSet(tables=[]){return new Set(tables.flatMap(t=>t.sourceLines||[]))}
