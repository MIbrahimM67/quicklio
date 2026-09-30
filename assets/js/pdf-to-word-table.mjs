const median=values=>{const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function groupRows(lines=[]){
  const sorted=lines.filter(l=>l&&String(l.text||'').trim()&&!l.vertical).slice().sort((a,b)=>Math.abs(b.y-a.y)>1?b.y-a.y:(a.xMin||0)-(b.xMin||0));
  const rows=[];
  for(const line of sorted){
    const tol=Math.max(2,Math.min(6,(Number(line.fontSize)||11)*.38));
    let row=rows.find(r=>Math.abs(r.y-(Number(line.y)||0))<=tol);
    if(!row){row={y:Number(line.y)||0,lines:[]};rows.push(row)}
    row.lines.push(line);row.y=median(row.lines.map(x=>Number(x.y)||0));
  }
  return rows.map(r=>({...r,lines:r.lines.slice().sort((a,b)=>(a.xMin||0)-(b.xMin||0))})).sort((a,b)=>b.y-a.y);
}

function clusterAnchors(values,tolerance){
  const clusters=[];
  for(const value of values.filter(Number.isFinite).slice().sort((a,b)=>a-b)){
    let c=clusters.find(x=>Math.abs(x.center-value)<=tolerance);
    if(!c){c={values:[],center:value};clusters.push(c)}
    c.values.push(value);c.center=median(c.values);
  }
  return clusters.sort((a,b)=>a.center-b.center);
}

function segmentCandidateRows(rows,pageWidth){
  const groups=[];let current=[];let previousY=null;
  const flush=()=>{if(current.length>=3)groups.push(current);current=[];previousY=null};
  for(const row of rows){
    if(row.lines.length<2){flush();continue}
    if(previousY!==null){
      const font=median(row.lines.map(l=>Number(l.fontSize)||11))||11;
      const gap=previousY-row.y;
      if(gap>Math.max(32,font*3,pageWidth*.04))flush();
    }
    current.push(row);previousY=row.y;
  }
  flush();return groups;
}

function inferColumns(rows,pageWidth){
  const tolerance=Math.max(10,pageWidth*.022);
  const clusters=clusterAnchors(rows.flatMap(r=>r.lines.map(l=>Number(l.xMin)||0)),tolerance);
  const supported=clusters.filter(c=>{
    c.support=rows.filter(r=>r.lines.some(l=>Math.abs((Number(l.xMin)||0)-c.center)<=tolerance)).length;
    return c.support>=Math.max(2,Math.ceil(rows.length*.66));
  });
  if(supported.length<2||supported.length>8)return null;
  const anchors=supported.map(c=>c.center).sort((a,b)=>a-b);
  for(let i=1;i<anchors.length;i++)if(anchors[i]-anchors[i-1]<Math.max(28,pageWidth*.055))return null;
  return anchors;
}

function nearestColumn(x,anchors){
  let best=-1,distance=Infinity;
  anchors.forEach((anchor,index)=>{const d=Math.abs(x-anchor);if(d<distance){best=index;distance=d}});
  return{index:best,distance};
}

function assignRow(row,anchors,pageWidth){
  const tolerance=Math.max(15,pageWidth*.038),cells=anchors.map(()=>[]);let misses=0;
  for(const line of row.lines){
    const match=nearestColumn(Number(line.xMin)||0,anchors);
    if(match.index<0||match.distance>tolerance){misses++;continue}
    cells[match.index].push(line);
  }
  return{cells,misses};
}

function cellFromLines(lines=[]){
  if(!lines.length)return{text:'',runs:[],bold:false,italic:false,rtl:false,fontSize:11,sourceLines:[]};
  const sorted=lines.slice().sort((a,b)=>Math.abs(b.y-a.y)>1?b.y-a.y:(a.xMin||0)-(b.xMin||0));
  const runs=[];
  sorted.forEach((line,lineIndex)=>{
    if(lineIndex)runs.push({text:'\n',fontSize:line.fontSize||11,bold:false,italic:false,rtl:line.rtl||false});
    for(const run of line.runs||[{text:line.text,fontSize:line.fontSize,bold:line.bold,italic:line.italic,rtl:line.rtl,fontFamily:line.fontFamily}])runs.push({...run});
  });
  return{
    text:sorted.map(l=>l.text).join('\n'),runs,
    bold:sorted.every(l=>l.bold),italic:sorted.every(l=>l.italic),rtl:sorted.filter(l=>l.rtl).length>sorted.length/2,
    fontSize:median(sorted.map(l=>Number(l.fontSize)||11))||11,sourceLines:sorted
  };
}

function inferEdges(rows,anchors,pageWidth){
  const tolerance=Math.max(15,pageWidth*.038),byColumn=anchors.map(()=>[]);
  for(const row of rows)for(const line of row.lines){const match=nearestColumn(Number(line.xMin)||0,anchors);if(match.index>=0&&match.distance<=tolerance)byColumn[match.index].push(line)}
  const edges=[];
  const firstLeft=Math.min(...byColumn[0].map(l=>Number(l.xMin)||anchors[0]),anchors[0]);
  edges.push(Math.max(0,firstLeft-5));
  for(let i=1;i<anchors.length;i++)edges.push((anchors[i-1]+anchors[i])/2);
  const last=byColumn.at(-1),lastRight=Math.max(...last.map(l=>Number(l.xMax)||anchors.at(-1)+36),anchors.at(-1)+36);
  edges.push(Math.min(pageWidth,lastRight+5));
  return edges;
}

function buildTable(rows,anchors,pageWidth,pageHeight){
  const assigned=rows.map(row=>({row,...assignRow(row,anchors,pageWidth)}));
  const totalLines=rows.reduce((n,r)=>n+r.lines.length,0),misses=assigned.reduce((n,r)=>n+r.misses,0);
  const coverage=1-misses/Math.max(1,totalLines);
  const fillRatio=assigned.reduce((n,r)=>n+r.cells.filter(c=>c.length).length,0)/(rows.length*anchors.length);
  const rowGaps=[];for(let i=1;i<rows.length;i++)rowGaps.push(rows[i-1].y-rows[i].y);
  const medianGap=median(rowGaps)||14,deviation=rowGaps.length?median(rowGaps.map(g=>Math.abs(g-medianGap))):0;
  const regularity=1-clamp(deviation/Math.max(8,medianGap),0,1);
  const confidence=clamp(.4*coverage+.35*fillRatio+.25*regularity,0,1);
  if(confidence<.78||fillRatio<.68)return null;
  const edges=inferEdges(rows,anchors,pageWidth);
  const font=median(rows.flatMap(r=>r.lines.map(l=>Number(l.fontSize)||11)))||11;
  const topBaseline=Math.max(...rows.map(r=>r.y)),bottomBaseline=Math.min(...rows.map(r=>r.y));
  const topPt=Math.max(0,pageHeight-topBaseline-font*1.05),bottomPt=Math.min(pageHeight,pageHeight-bottomBaseline+font*.65);
  const tableRows=assigned.map(({row,cells})=>({y:row.y,cells:cells.map(cellFromLines)}));
  const firstRowBold=tableRows[0].cells.filter(c=>c.text).length>0&&tableRows[0].cells.filter(c=>c.text).every(c=>c.bold);
  return{
    rows:tableRows,columns:anchors.length,columnAnchors:anchors,
    columnWidthsPt:anchors.map((_,i)=>Math.max(24,edges[i+1]-edges[i])),
    xPt:edges[0],yTopPt:topPt,widthPt:Math.max(48,edges.at(-1)-edges[0]),heightPt:Math.max(font*1.5,bottomPt-topPt),
    confidence,headerRow:firstRowBold,sourceLines:rows.flatMap(r=>r.lines)
  };
}

export function detectTables(lines=[],pageWidth=612,pageHeight=792){
  const rows=groupRows(lines),groups=segmentCandidateRows(rows,pageWidth),tables=[];
  for(const group of groups){const anchors=inferColumns(group,pageWidth);if(!anchors)continue;const table=buildTable(group,anchors,pageWidth,pageHeight);if(table)tables.push(table)}
  return tables;
}

export function tableSourceLineSet(tables=[]){return new Set(tables.flatMap(t=>t.sourceLines||[]))}
