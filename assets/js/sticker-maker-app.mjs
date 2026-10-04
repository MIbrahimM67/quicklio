import{loadImageFile,downloadBlob}from'/assets/js/opportunity-image-core.mjs';
import{detectBackgroundColor,removeConnectedBackground,rgbToHex}from'/assets/js/logo-background-core.mjs';
import{canvasPngWithDpi}from'/assets/js/png-dpi.mjs';
import{stickerPhysicalSize,planStickerLayout,formatInches}from'/assets/js/sticker-maker-core.mjs';

const $=id=>document.getElementById(id);
const els={
  file:$('fileInput'),fileMeta:$('fileMeta'),resultPanel:$('resultPanel'),resultCanvas:$('resultCanvas'),sheetCanvas:$('sheetCanvas'),status:$('status'),
  removeBg:$('removeBackground'),tolerance:$('bgTolerance'),toleranceValue:$('bgToleranceValue'),softness:$('edgeSoftness'),softnessValue:$('edgeSoftnessValue'),detectedBg:$('detectedBg'),
  border:$('borderIn'),borderValue:$('borderValue'),borderColor:$('borderColor'),width:$('stickerWidth'),finishedHeight:$('finishedHeight'),paper:$('paper'),copies:$('copies'),gap:$('gapIn'),rotate:$('allowRotate'),
  fitPerSheet:$('fitPerSheet'),sheetCount:$('sheetCount'),utilization:$('utilization'),layoutMode:$('layoutMode'),planningArea:$('planningArea'),pixelSize:$('pixelSize'),
  process:$('processBtn'),downloadSticker:$('downloadPng'),downloadSheet:$('downloadSheetPreview')
};

let bitmap=null,trimmedCanvas=null,stickerCanvas=null,currentPlan=null,currentSize=null,processToken=0,timer=null;
const EXPORT_DPI=300,MAX_WORK_SIDE=2400,MAX_EXPORT_PIXELS=18_000_000;

function setStatus(message,type=''){
  els.status.textContent=message;
  els.status.className='op-status'+(type?' '+type:'');
}
function setDownloads(enabled){els.downloadSticker.disabled=!enabled;els.downloadSheet.disabled=!enabled;}
function updateLabels(){
  els.toleranceValue.textContent=els.tolerance.value;
  els.softnessValue.textContent=els.softness.value;
  els.borderValue.textContent=`${Number(els.border.value).toFixed(2)} in`;
}
function resetStats(){for(const el of[els.fitPerSheet,els.sheetCount,els.utilization,els.layoutMode,els.planningArea,els.pixelSize])el.textContent='—';els.finishedHeight.textContent='—';}
function clampCanvasSize(width,height,maxSide=MAX_WORK_SIDE){const scale=Math.min(1,maxSide/Math.max(width,height));return{width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}
function alphaBounds(imageData){
  const{data,width,height}=imageData;let minX=width,minY=height,maxX=-1,maxY=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(data[(y*width+x)*4+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
  if(maxX<minX||maxY<minY)return{x:0,y:0,width,height};
  const pad=2,x=Math.max(0,minX-pad),y=Math.max(0,minY-pad),x2=Math.min(width-1,maxX+pad),y2=Math.min(height-1,maxY+pad);
  return{x,y,width:x2-x+1,height:y2-y+1};
}
function cropCanvas(source,bounds){const c=document.createElement('canvas');c.width=bounds.width;c.height=bounds.height;c.getContext('2d').drawImage(source,bounds.x,bounds.y,bounds.width,bounds.height,0,0,bounds.width,bounds.height);return c;}
function recoloredAlpha(source,color){const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,c.width,c.height);ctx.globalCompositeOperation='source-over';return c;}
function drawStickerWithBorder(content,size,borderColor){
  const borderPx=Math.max(0,Math.round(size.borderIn*EXPORT_DPI));
  const contentW=Math.max(1,Math.round(size.contentWidthIn*EXPORT_DPI)),contentH=Math.max(1,Math.round(size.contentHeightIn*EXPORT_DPI));
  const outW=contentW+2*borderPx,outH=contentH+2*borderPx;
  if(outW*outH>MAX_EXPORT_PIXELS)throw new Error('This sticker would create an extremely large image. Reduce the finished width.');
  const art=document.createElement('canvas');art.width=contentW;art.height=contentH;const actx=art.getContext('2d');actx.imageSmoothingEnabled=true;actx.imageSmoothingQuality='high';actx.drawImage(content,0,0,contentW,contentH);
  const out=document.createElement('canvas');out.width=outW;out.height=outH;const ctx=out.getContext('2d');
  if(borderPx>0){
    const mask=recoloredAlpha(art,borderColor),rings=[borderPx,Math.max(1,Math.round(borderPx*.55))];
    for(const radius of rings){const steps=Math.max(24,Math.ceil(2*Math.PI*radius/1.5));for(let i=0;i<steps;i++){const angle=i/steps*Math.PI*2;ctx.drawImage(mask,borderPx+Math.cos(angle)*radius,borderPx+Math.sin(angle)*radius);}}
    ctx.drawImage(mask,borderPx,borderPx);
  }
  ctx.drawImage(art,borderPx,borderPx);
  return out;
}
function drawPreview(sticker){
  els.resultCanvas.width=sticker.width;els.resultCanvas.height=sticker.height;const ctx=els.resultCanvas.getContext('2d');ctx.clearRect(0,0,sticker.width,sticker.height);ctx.drawImage(sticker,0,0);
}
function drawSheetPreview(sticker,plan){
  const page=plan.paper,pxPerIn=72,w=Math.round(page.width*pxPerIn),h=Math.round(page.height*pxPerIn),canvas=els.sheetCanvas;canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f7f5ef';ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(1,1,w-2,h-2);ctx.strokeStyle='#b9b3a8';ctx.lineWidth=2;ctx.strokeRect(1,1,w-2,h-2);
  const inset=plan.planningArea.inset*pxPerIn,safeW=plan.planningArea.width*pxPerIn,safeH=plan.planningArea.height*pxPerIn;
  ctx.save();ctx.setLineDash([8,6]);ctx.strokeStyle='#6f963f';ctx.lineWidth=2;ctx.strokeRect(inset,inset,safeW,safeH);ctx.restore();
  for(const pos of plan.positions){
    const cx=inset+(pos.x+pos.width/2)*pxPerIn,cy=inset+(pos.y+pos.height/2)*pxPerIn,dw=plan.sticker.width*pxPerIn,dh=plan.sticker.height*pxPerIn;
    ctx.save();ctx.translate(cx,cy);if(pos.rotated)ctx.rotate(Math.PI/2);ctx.drawImage(sticker,-dw/2,-dh/2,dw,dh);ctx.restore();
  }
  ctx.fillStyle='#5c5a55';ctx.font='12px system-ui,sans-serif';ctx.fillText('Planning preview only — arrange and print from Cricut Design Space',14,h-14);
}
function updateStats(plan,size,sticker){
  els.finishedHeight.textContent=formatInches(size.finishedHeightIn);
  els.fitPerSheet.textContent=String(plan.perSheet);
  els.sheetCount.textContent=String(plan.sheets);
  els.utilization.textContent=`${plan.utilizationPct.toFixed(0)}%`;
  els.layoutMode.textContent=plan.mode;
  els.planningArea.textContent=`${formatInches(plan.planningArea.width)} × ${formatInches(plan.planningArea.height)}`;
  els.pixelSize.textContent=`${sticker.width} × ${sticker.height}px @ ${EXPORT_DPI} DPI`;
}
async function prepareSource(){
  if(!bitmap)return null;
  const size=clampCanvasSize(bitmap.width,bitmap.height),c=document.createElement('canvas');c.width=size.width;c.height=size.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,c.width,c.height);
  let img=ctx.getImageData(0,0,c.width,c.height);
  const bg=detectBackgroundColor(img.data,c.width,c.height);els.detectedBg.title=rgbToHex(bg);els.detectedBg.style.backgroundColor=rgbToHex(bg);
  if(els.removeBg.checked){const removed=removeConnectedBackground({data:img.data,width:c.width,height:c.height,background:bg,tolerance:Number(els.tolerance.value),softness:Number(els.softness.value)});img=new ImageData(removed.data,c.width,c.height);ctx.putImageData(img,0,0);}else ctx.putImageData(img,0,0);
  trimmedCanvas=cropCanvas(c,alphaBounds(ctx.getImageData(0,0,c.width,c.height)));return trimmedCanvas;
}
async function process(){
  if(!bitmap){setStatus('Upload an image to start.');return;}
  const token=++processToken;setDownloads(false);els.process.disabled=true;setStatus('Building your sticker and layout…');
  try{
    const content=await prepareSource();if(token!==processToken)return;
    currentSize=stickerPhysicalSize({sourceWidth:content.width,sourceHeight:content.height,finishedWidthIn:Number(els.width.value),borderIn:Number(els.border.value)});
    stickerCanvas=drawStickerWithBorder(content,currentSize,els.borderColor.value);
    currentPlan=planStickerLayout({paper:els.paper.value,stickerWidthIn:currentSize.finishedWidthIn,stickerHeightIn:currentSize.finishedHeightIn,gapIn:Number(els.gap.value),copies:Number(els.copies.value),allowRotate:els.rotate.checked});
    drawPreview(stickerCanvas);drawSheetPreview(stickerCanvas,currentPlan);updateStats(currentPlan,currentSize,stickerCanvas);els.resultPanel.hidden=false;setDownloads(true);
    const caution=currentPlan.mode==='Mixed'?'The estimate uses mixed orientations to fit more copies.':'The estimate compares normal and rotated layouts.';
    setStatus(`${currentPlan.perSheet} sticker${currentPlan.perSheet===1?'':'s'} fit in the conservative ${currentPlan.paper.label} planning area. ${caution}`,'ok');
  }catch(error){currentPlan=null;stickerCanvas=null;setDownloads(false);setStatus(error?.message||'Could not create the sticker.','error');}
  finally{if(token===processToken)els.process.disabled=false;}
}
function queueProcess(){updateLabels();if(!bitmap)return;clearTimeout(timer);timer=setTimeout(process,100);}

els.file.addEventListener('change',async()=>{
  const file=els.file.files?.[0];if(!file)return;
  try{
    if(bitmap?.close)bitmap.close();bitmap=await loadImageFile(file,{maxBytes:25e6,maxPixels:24e6});els.fileMeta.textContent=`${file.name} · ${bitmap.width} × ${bitmap.height}px`;resetStats();await process();
  }catch(error){bitmap=null;setDownloads(false);els.resultPanel.hidden=true;setStatus(error?.message||'Could not read that image.','error');}
});
for(const el of[els.removeBg,els.tolerance,els.softness,els.border,els.borderColor,els.width,els.paper,els.copies,els.gap,els.rotate])el.addEventListener('input',queueProcess);
els.process.addEventListener('click',process);
els.downloadSticker.addEventListener('click',async()=>{if(!stickerCanvas)return;const blob=await canvasPngWithDpi(stickerCanvas,EXPORT_DPI);downloadBlob(blob,'quicklio-cricut-sticker.png');});
els.downloadSheet.addEventListener('click',()=>{if(!currentPlan)return;els.sheetCanvas.toBlob(blob=>{if(blob)downloadBlob(blob,'quicklio-sticker-layout-preview.png')},'image/png');});
updateLabels();resetStats();setDownloads(false);
