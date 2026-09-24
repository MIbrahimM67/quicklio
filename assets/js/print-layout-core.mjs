export const PT_PER_IN=72;
export const MM_PER_IN=25.4;
export const mmToPt=mm=>Number(mm)*PT_PER_IN/MM_PER_IN;
export const inToPt=inch=>Number(inch)*PT_PER_IN;
export const ptToPx=(pt,dpi=144)=>Number(pt)*Number(dpi)/72;
export const PAPER={
  letter:{width:612,height:792,label:"Letter"},
  a4:{width:mmToPt(210),height:mmToPt(297),label:"A4"},
  photo4x6:{width:inToPt(4),height:inToPt(6),label:"4 × 6 in"},
  photo5x7:{width:inToPt(5),height:inToPt(7),label:"5 × 7 in"},
  photo10x15:{width:mmToPt(100),height:mmToPt(150),label:"10 × 15 cm"}
};
export const PASSPORT_PRESETS={
  us:{label:"US passport · 2 × 2 in",widthIn:2,heightIn:2},
  uk:{label:"UK passport · 35 × 45 mm",widthMm:35,heightMm:45},
  schengen:{label:"Schengen / visa · 35 × 45 mm",widthMm:35,heightMm:45},
  canada:{label:"Canada passport · 50 × 70 mm",widthMm:50,heightMm:70},
  australia:{label:"Australia passport · 35 × 45 mm",widthMm:35,heightMm:45},
  india:{label:"India passport-size · 35 × 45 mm",widthMm:35,heightMm:45}
};
export function passportSize(key="us",dpi=300,custom=null){
  const p=key==="custom"?custom:PASSPORT_PRESETS[key];
  if(!p)throw Error("Unknown photo preset.");
  const widthIn=p.widthIn??Number(p.widthMm)/MM_PER_IN;
  const heightIn=p.heightIn??Number(p.heightMm)/MM_PER_IN;
  if(!Number.isFinite(widthIn)||!Number.isFinite(heightIn)||widthIn<=0||heightIn<=0)throw Error("Photo dimensions must be greater than zero.");
  return{widthIn,heightIn,widthPx:Math.round(widthIn*dpi),heightPx:Math.round(heightIn*dpi),widthPt:widthIn*72,heightPt:heightIn*72,label:p.label||"Custom"};
}
export function fitRect(srcW,srcH,dstW,dstH,mode="contain"){
  [srcW,srcH,dstW,dstH].forEach(v=>{if(!Number.isFinite(Number(v))||Number(v)<=0)throw Error("Dimensions must be greater than zero.")});
  const scale=(mode==="cover"?Math.max:Math.min)(dstW/srcW,dstH/srcH),width=srcW*scale,height=srcH*scale;
  return{x:(dstW-width)/2,y:(dstH-height)/2,width,height,scale};
}
export function packRects(pageW,pageH,itemW,itemH,{margin=18,gap=8}={}){
  const cols=Math.max(0,Math.floor((pageW-2*margin+gap)/(itemW+gap)));
  const rows=Math.max(0,Math.floor((pageH-2*margin+gap)/(itemH+gap)));
  const positions=[];
  const usedW=cols?cols*itemW+(cols-1)*gap:0,usedH=rows?rows*itemH+(rows-1)*gap:0;
  const startX=(pageW-usedW)/2,startY=(pageH-usedH)/2;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)positions.push({x:startX+c*(itemW+gap),y:startY+r*(itemH+gap),width:itemW,height:itemH,row:r,col:c});
  return{cols,rows,count:positions.length,positions};
}
export function contactSheetPlan(pageW,pageH,cols,rows,{margin=24,gap=10,labelHeight=0}={}){
  cols=Number(cols);rows=Number(rows);
  if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1)throw Error("Grid rows and columns must be positive integers.");
  const cellW=(pageW-2*margin-(cols-1)*gap)/cols;
  const cellH=(pageH-2*margin-(rows-1)*gap)/rows;
  if(cellW<=0||cellH<=0)throw Error("Grid does not fit the page.");
  const cells=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)cells.push({x:margin+c*(cellW+gap),y:margin+r*(cellH+gap),width:cellW,height:cellH,imageHeight:Math.max(1,cellH-labelHeight),row:r,col:c});
  return{cellW,cellH,cells,perPage:cells.length};
}
export function posterPlan({imageWidth,imageHeight,pageWidth,pageHeight,cols,rows,overlap=0}){
  [imageWidth,imageHeight,pageWidth,pageHeight].forEach(v=>{if(!Number.isFinite(Number(v))||Number(v)<=0)throw Error("Poster dimensions must be greater than zero.")});
  cols=Number(cols);rows=Number(rows);overlap=Number(overlap);
  if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1)throw Error("Poster rows and columns must be positive integers.");
  if(!Number.isFinite(overlap)||overlap<0||overlap>=Math.min(pageWidth,pageHeight))throw Error("Overlap is too large.");
  const posterWidth=pageWidth*cols-overlap*(cols-1),posterHeight=pageHeight*rows-overlap*(rows-1);
  const image=fitRect(imageWidth,imageHeight,posterWidth,posterHeight,"contain");
  const tiles=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)tiles.push({row:r,col:c,x:c*(pageWidth-overlap),y:r*(pageHeight-overlap),width:pageWidth,height:pageHeight});
  return{posterWidth,posterHeight,image,tiles,pageCount:tiles.length};
}

export function posterPlanForSize({imageWidth,imageHeight,pageWidth,pageHeight,posterWidth,posterHeight,overlap=0}){
  [posterWidth,posterHeight].forEach(v=>{if(!Number.isFinite(Number(v))||Number(v)<=0)throw Error("Final poster size must be greater than zero.")});
  overlap=Number(overlap);if(!Number.isFinite(overlap)||overlap<0||overlap>=Math.min(pageWidth,pageHeight))throw Error("Overlap is too large.");
  const stepX=pageWidth-overlap,stepY=pageHeight-overlap;
  const cols=Math.max(1,Math.ceil((posterWidth-overlap)/stepX)),rows=Math.max(1,Math.ceil((posterHeight-overlap)/stepY));
  const image=fitRect(imageWidth,imageHeight,posterWidth,posterHeight,"contain"),tiles=[];
  for(let r=0;r<rows;r++)for(let col=0;col<cols;col++)tiles.push({row:r,col,x:col*stepX,y:r*stepY,width:pageWidth,height:pageHeight});
  return{posterWidth,posterHeight,image,tiles,pageCount:tiles.length,cols,rows};
}
