export function targetRange(mode,minKb,maxKb,targetKb){
  if(mode==="max"){
    const max=Number(maxKb);
    if(!Number.isFinite(max)||max<=0)throw Error("Maximum KB must be greater than zero.");
    return{min:0,max};
  }
  if(mode==="target"){
    const target=Number(targetKb);
    if(!Number.isFinite(target)||target<=0)throw Error("Target KB must be greater than zero.");
    const tolerance=Math.max(1,target*0.03);
    return{min:Math.max(0,target-tolerance),max:target+tolerance};
  }
  const min=Number(minKb),max=Number(maxKb);
  if(!Number.isFinite(min)||!Number.isFinite(max)||min<=0||max<=0||min>=max)throw Error("Enter a valid KB range.");
  return{min,max};
}
export function fitDimensions(srcW,srcH,targetW,targetH,mode="crop"){
  srcW=Number(srcW);srcH=Number(srcH);targetW=Number(targetW);targetH=Number(targetH);
  if([srcW,srcH,targetW,targetH].some(v=>!Number.isFinite(v)||v<=0))throw Error("Dimensions must be greater than zero.");
  if(mode==="stretch")return{drawW:targetW,drawH:targetH,offsetX:0,offsetY:0,canvasW:targetW,canvasH:targetH,scaleX:targetW/srcW,scaleY:targetH/srcH};
  const ratio=mode==="fit"?Math.min(targetW/srcW,targetH/srcH):Math.max(targetW/srcW,targetH/srcH);
  const drawW=srcW*ratio,drawH=srcH*ratio;
  return{drawW,drawH,offsetX:(targetW-drawW)/2,offsetY:(targetH-drawH)/2,canvasW:targetW,canvasH:targetH,scaleX:ratio,scaleY:ratio};
}
export function kb(bytes){return bytes/1024}
