export function rotatedCanvasSize(width,height,degrees){
  const r=((Number(degrees)%360)+360)%360;
  if(r===90||r===270)return{width:Number(height),height:Number(width)};
  return{width:Number(width),height:Number(height)};
}
export function resizeScale(oldWidth,oldHeight,newWidth,newHeight){
  const vals=[oldWidth,oldHeight,newWidth,newHeight].map(Number);
  if(vals.some(v=>!Number.isFinite(v)||v<=0))throw Error("Canvas dimensions must be greater than zero.");
  return{scaleX:vals[2]/vals[0],scaleY:vals[3]/vals[1]};
}
export function clampCrop(x,y,width,height,canvasWidth,canvasHeight){
  x=Math.max(0,Number(x));y=Math.max(0,Number(y));width=Math.max(1,Number(width));height=Math.max(1,Number(height));
  const cw=Number(canvasWidth),ch=Number(canvasHeight);
  if(!Number.isFinite(cw)||!Number.isFinite(ch)||cw<=0||ch<=0)throw Error("Canvas size is invalid.");
  if(x>=cw||y>=ch)throw Error("Crop selection is outside the canvas.");
  return{x,y,width:Math.min(width,cw-x),height:Math.min(height,ch-y)};
}
