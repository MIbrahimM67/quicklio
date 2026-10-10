export const IMAGE_PDF_PROFILES={
  smart:{label:'Smart',dpi:220,quality:.90,maxDimension:3200,maxPixels:9_000_000},
  high:{label:'High quality',dpi:300,quality:.94,maxDimension:4500,maxPixels:16_000_000},
  small:{label:'Smaller file',dpi:150,quality:.80,maxDimension:2200,maxPixels:5_000_000}
};
function positive(v,name){const n=Number(v);if(!Number.isFinite(n)||n<=0)throw Error(name+' must be greater than zero.');return n}
export function fitPlacement(sourceWidth,sourceHeight,pageWidth,pageHeight,margin=0,fit='contain'){
  sourceWidth=positive(sourceWidth,'Image width');sourceHeight=positive(sourceHeight,'Image height');
  pageWidth=positive(pageWidth,'Page width');pageHeight=positive(pageHeight,'Page height');margin=Math.max(0,Number(margin)||0);
  const aw=pageWidth-2*margin,ah=pageHeight-2*margin;if(aw<=0||ah<=0)throw Error('Margin is too large for this page.');
  const scale=(fit==='cover'?Math.max:Math.min)(aw/sourceWidth,ah/sourceHeight);
  const width=sourceWidth*scale,height=sourceHeight*scale;
  return{x:(pageWidth-width)/2,y:(pageHeight-height)/2,width,height};
}
export function imagePdfRasterPlan({sourceWidth,sourceHeight,pageWidth,pageHeight,margin=0,fit='contain',pageMode='image',profile='smart'}){
  const p=IMAGE_PDF_PROFILES[profile]||IMAGE_PDF_PROFILES.smart;
  sourceWidth=positive(sourceWidth,'Image width');sourceHeight=positive(sourceHeight,'Image height');
  const placement=fitPlacement(sourceWidth,sourceHeight,pageWidth,pageHeight,margin,fit);
  let scale=1;
  if(pageMode==='image'){
    scale=Math.min(scale,p.maxDimension/Math.max(sourceWidth,sourceHeight));
  }else{
    const targetW=placement.width/72*p.dpi,targetH=placement.height/72*p.dpi;
    scale=Math.min(scale,targetW/sourceWidth,targetH/sourceHeight,p.maxDimension/Math.max(sourceWidth,sourceHeight));
  }
  const pixels=sourceWidth*sourceHeight;
  if(pixels*scale*scale>p.maxPixels)scale=Math.min(scale,Math.sqrt(p.maxPixels/pixels));
  scale=Math.min(1,Math.max(scale,.01));
  const rasterWidth=Math.max(1,Math.round(sourceWidth*scale)),rasterHeight=Math.max(1,Math.round(sourceHeight*scale));
  const effectiveDpi=Math.round(Math.min(rasterWidth/(placement.width/72),rasterHeight/(placement.height/72)));
  return{...placement,rasterWidth,rasterHeight,quality:p.quality,effectiveDpi,reduced:scale<.999,scale,profileLabel:p.label};
}
export function formatBytes(bytes){
  const n=Number(bytes)||0;if(n<1024)return n+' B';if(n<1024**2)return(n/1024).toFixed(1)+' KB';return(n/1024**2).toFixed(n>=10*1024**2?1:2)+' MB';
}
