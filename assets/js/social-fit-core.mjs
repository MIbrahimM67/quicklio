export const RATIOS={portrait:4/5,square:1,landscape:1.91,story:9/16};
export function canvasForRatio(ratio,width=1080){
  const r=typeof ratio==="string"?RATIOS[ratio]:Number(ratio);
  if(!Number.isFinite(r)||r<=0)throw Error("Invalid aspect ratio.");
  return{width:Math.round(width),height:Math.round(width/r)};
}
export function containRect(srcW,srcH,dstW,dstH){
  const scale=Math.min(dstW/srcW,dstH/srcH),w=srcW*scale,h=srcH*scale;
  return{x:(dstW-w)/2,y:(dstH-h)/2,width:w,height:h,scale};
}
export function coverRect(srcW,srcH,dstW,dstH){
  const scale=Math.max(dstW/srcW,dstH/srcH),w=srcW*scale,h=srcH*scale;
  return{x:(dstW-w)/2,y:(dstH-h)/2,width:w,height:h,scale};
}
