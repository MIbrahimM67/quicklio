const MIN_DIMENSION_IN=0.05;
export const DEFAULT_SAFE_INSET_IN=0.84;
export const STICKER_PAPERS={
  letter:{label:'US Letter',width:8.5,height:11},
  a4:{label:'A4',width:8.2677,height:11.6929}
};

const positive=(value,name)=>{
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0)throw new Error(`${name} must be greater than zero.`);
  return n;
};

export function getStickerPaper(key='letter'){
  const paper=STICKER_PAPERS[key];
  if(!paper)throw new Error('Choose a supported paper size.');
  return {...paper,key};
}

export function getPlanningArea(paper='letter',insetIn=DEFAULT_SAFE_INSET_IN){
  const p=getStickerPaper(paper),inset=Number(insetIn);
  if(!Number.isFinite(inset)||inset<0)throw new Error('Planning inset must be zero or greater.');
  const width=p.width-2*inset,height=p.height-2*inset;
  if(width<=0||height<=0)throw new Error('Planning inset is too large for this page.');
  return{paper:p,width,height,inset};
}

export function stickerPhysicalSize({sourceWidth,sourceHeight,finishedWidthIn=3,borderIn=.08}){
  const srcW=positive(sourceWidth,'Source width'),srcH=positive(sourceHeight,'Source height');
  const finishedW=positive(finishedWidthIn,'Finished sticker width');
  const border=Number(borderIn);
  if(!Number.isFinite(border)||border<0)throw new Error('Border must be zero or greater.');
  if(finishedW<=2*border+MIN_DIMENSION_IN)throw new Error('Sticker width is too small for that border.');
  const contentWidth=finishedW-2*border;
  const contentHeight=contentWidth*(srcH/srcW);
  const finishedHeight=contentHeight+2*border;
  return{
    sourceAspect:srcW/srcH,
    contentWidthIn:contentWidth,
    contentHeightIn:contentHeight,
    finishedWidthIn:finishedW,
    finishedHeightIn:finishedHeight,
    borderIn:border
  };
}

function countAxis(space,item,gap){
  return Math.max(0,Math.floor((space+gap)/(item+gap)+1e-10));
}

function rowPositions(areaW,itemW,itemH,gap,rowCount,startY=0){
  const cols=countAxis(areaW,itemW,gap),usedW=cols?cols*itemW+(cols-1)*gap:0;
  const startX=(areaW-usedW)/2,positions=[];
  for(let row=0;row<rowCount;row++)for(let col=0;col<cols;col++)positions.push({x:startX+col*(itemW+gap),y:startY+row*(itemH+gap),width:itemW,height:itemH,rotated:false,row,col});
  return{cols,positions};
}

function gridCandidate(areaW,areaH,w,h,gap,{rotated=false,label='Standard'}={}){
  const cols=countAxis(areaW,w,gap),rows=countAxis(areaH,h,gap),positions=[];
  const usedW=cols?cols*w+(cols-1)*gap:0,usedH=rows?rows*h+(rows-1)*gap:0;
  const startX=(areaW-usedW)/2,startY=(areaH-usedH)/2;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)positions.push({x:startX+col*(w+gap),y:startY+row*(h+gap),width:w,height:h,rotated,row,col});
  return{mode:label,cols,rows,count:positions.length,positions};
}

function mixedRowCandidates(areaW,areaH,w,h,gap){
  const results=[],normalRows=countAxis(areaH,h,gap),normalCols=countAxis(areaW,w,gap),rotW=h,rotH=w,rotCols=countAxis(areaW,rotW,gap);
  if(!normalCols||!rotCols||normalRows<1)return results;
  for(let baseRows=1;baseRows<=normalRows;baseRows++){
    const baseHeight=baseRows*h+Math.max(0,baseRows-1)*gap;
    const nextY=baseHeight+(baseRows?gap:0),remaining=Math.max(0,areaH-nextY),rotRows=countAxis(remaining,rotH,gap);
    if(!rotRows)continue;
    const base=rowPositions(areaW,w,h,gap,baseRows,0).positions;
    const rotatedRaw=rowPositions(areaW,rotW,rotH,gap,rotRows,nextY).positions.map(p=>({...p,rotated:true}));
    const positions=[...base,...rotatedRaw];
    results.push({mode:'Mixed',cols:Math.max(normalCols,rotCols),rows:baseRows+rotRows,count:positions.length,positions});
  }
  return results;
}

function score(candidate){return candidate.count*1e6-candidate.positions.reduce((sum,p)=>sum+p.y*.0001+p.x*.000001,0)}

export function planStickerLayout({paper='letter',stickerWidthIn,stickerHeightIn,gapIn=.125,copies=12,allowRotate=true,insetIn=DEFAULT_SAFE_INSET_IN}={}){
  const area=getPlanningArea(paper,insetIn),w=positive(stickerWidthIn,'Sticker width'),h=positive(stickerHeightIn,'Sticker height'),gap=Number(gapIn),qty=Number(copies);
  if(!Number.isFinite(gap)||gap<0)throw new Error('Sticker gap must be zero or greater.');
  if(!Number.isInteger(qty)||qty<1||qty>10000)throw new Error('Copies must be a whole number between 1 and 10,000.');
  const candidates=[gridCandidate(area.width,area.height,w,h,gap,{label:'Standard'})];
  if(allowRotate&&Math.abs(w-h)>.0001){
    candidates.push(gridCandidate(area.width,area.height,h,w,gap,{rotated:true,label:'Rotated'}));
    candidates.push(...mixedRowCandidates(area.width,area.height,w,h,gap));
    candidates.push(...mixedRowCandidates(area.width,area.height,h,w,gap).map(c=>({...c,positions:c.positions.map(p=>({...p,rotated:!p.rotated}))})));
  }
  const viable=candidates.filter(c=>c.count>0);
  if(!viable.length)throw new Error('This sticker does not fit inside the conservative planning area. Reduce the sticker size or gap.');
  viable.sort((a,b)=>score(b)-score(a));
  const best=viable[0],shown=Math.min(qty,best.count);
  return{
    paper:area.paper,
    planningArea:{width:area.width,height:area.height,inset:area.inset},
    sticker:{width:w,height:h,gap},
    mode:best.mode,
    perSheet:best.count,
    sheets:Math.ceil(qty/best.count),
    copies:qty,
    shownOnFirstSheet:shown,
    utilizationPct:Math.min(100,(best.count*w*h)/(area.width*area.height)*100),
    positions:best.positions.slice(0,shown),
    candidates:viable.map(c=>({mode:c.mode,count:c.count,cols:c.cols,rows:c.rows}))
  };
}

export function formatInches(value,digits=2){
  const n=Number(value);
  if(!Number.isFinite(n))return '—';
  return `${n.toFixed(digits).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')} in`;
}
