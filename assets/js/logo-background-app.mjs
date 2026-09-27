import{detectBackgroundColor,removeConnectedBackground,rgbToHex,hexToRgb}from'/assets/js/logo-background-core.mjs';

const fileInput=document.querySelector('#fileInput');
const dropZone=document.querySelector('#dropZone');
const sourceCanvas=document.querySelector('#sourceCanvas');
const resultCanvas=document.querySelector('#resultCanvas');
const sourceCtx=sourceCanvas.getContext('2d',{willReadFrequently:true});
const resultCtx=resultCanvas.getContext('2d');
const fileMeta=document.querySelector('#fileMeta');
const backgroundColor=document.querySelector('#backgroundColor');
const tolerance=document.querySelector('#tolerance');
const toleranceValue=document.querySelector('#toleranceValue');
const softness=document.querySelector('#softness');
const softnessValue=document.querySelector('#softnessValue');
const removeBtn=document.querySelector('#removeBtn');
const resetBtn=document.querySelector('#resetBtn');
const downloadBtn=document.querySelector('#downloadBtn');
const resultPanel=document.querySelector('#resultPanel');
const status=document.querySelector('#status');
const previewBackground=document.querySelector('#previewBackground');
const customPreviewColor=document.querySelector('#customPreviewColor');
const resultStage=document.querySelector('#resultStage');
const pickedSwatch=document.querySelector('#pickedSwatch');
let originalImageData=null;
let objectUrl=null;
let lastFileName='logo';

function setStatus(message,type=''){
  status.textContent=message;
  status.className='status-line'+(type?' '+type:'');
}
function formatBytes(bytes){
  if(bytes<1024)return bytes+' B';
  if(bytes<1024*1024)return(bytes/1024).toFixed(1)+' KB';
  return(bytes/1024/1024).toFixed(1)+' MB';
}
function updateSwatch(){
  pickedSwatch.style.background=backgroundColor.value;
  pickedSwatch.title='Background color '+backgroundColor.value;
}
function applyPreviewBackground(){
  const value=previewBackground.value;
  resultStage.dataset.preview=value;
  if(value==='custom')resultStage.style.setProperty('--preview-bg',customPreviewColor.value);
  else resultStage.style.removeProperty('--preview-bg');
  customPreviewColor.hidden=value!=='custom';
}
function clearResult(){
  resultPanel.hidden=true;
  downloadBtn.disabled=true;
  resultCanvas.width=1;resultCanvas.height=1;
}
function setCanvasSize(canvas,w,h){canvas.width=w;canvas.height=h;}

async function loadFile(file){
  clearResult();
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){
    setStatus('Choose a PNG, JPG/JPEG, or WebP logo.','error');return;
  }
  if(file.size>20*1024*1024){setStatus('This file is over 20 MB. Choose a smaller logo image.','error');return;}
  if(objectUrl)URL.revokeObjectURL(objectUrl);
  objectUrl=URL.createObjectURL(file);
  const img=new Image();
  img.decoding='async';
  img.src=objectUrl;
  try{await img.decode();}catch{setStatus('Quicklio could not decode this image.','error');return;}
  const pixels=img.naturalWidth*img.naturalHeight;
  if(pixels>12000000){setStatus('This image is over 12 megapixels. Resize it first for reliable browser processing.','error');return;}
  setCanvasSize(sourceCanvas,img.naturalWidth,img.naturalHeight);
  sourceCtx.clearRect(0,0,sourceCanvas.width,sourceCanvas.height);
  sourceCtx.drawImage(img,0,0);
  originalImageData=sourceCtx.getImageData(0,0,sourceCanvas.width,sourceCanvas.height);
  const auto=detectBackgroundColor(originalImageData.data,sourceCanvas.width,sourceCanvas.height);
  backgroundColor.value=rgbToHex(auto);updateSwatch();
  lastFileName=(file.name.replace(/\.[^.]+$/,'')||'logo').replace(/[^a-z0-9_-]+/gi,'-');
  fileMeta.textContent=`${file.name} · ${img.naturalWidth} × ${img.naturalHeight}px · ${formatBytes(file.size)}`;
  removeBtn.disabled=false;resetBtn.disabled=false;
  setStatus('Logo loaded. The corner background color was detected automatically. Click the original preview to pick a different background color.');
}

function processImage(){
  if(!originalImageData)return;
  setStatus('Removing the edge-connected background…');
  removeBtn.disabled=true;
  requestAnimationFrame(()=>{
    try{
      const result=removeConnectedBackground({
        data:originalImageData.data,width:sourceCanvas.width,height:sourceCanvas.height,
        background:hexToRgb(backgroundColor.value),tolerance:Number(tolerance.value),softness:Number(softness.value)
      });
      setCanvasSize(resultCanvas,sourceCanvas.width,sourceCanvas.height);
      resultCtx.putImageData(new ImageData(result.data,sourceCanvas.width,sourceCanvas.height),0,0);
      const percent=Math.round(result.removedPixels/(sourceCanvas.width*sourceCanvas.height)*100);
      document.querySelector('#resultMeta').textContent=`${sourceCanvas.width} × ${sourceCanvas.height}px · ${percent}% fully transparent pixels`;
      resultPanel.hidden=false;downloadBtn.disabled=false;
      setStatus('Transparent PNG ready. If edges look too tight or too loose, adjust Tolerance or Edge softness and run it again.','success');
    }catch(error){setStatus(error?.message||'Could not process this logo.','error');}
    finally{removeBtn.disabled=false;}
  });
}

function downloadResult(){
  if(downloadBtn.disabled)return;
  resultCanvas.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`${lastFileName}-transparent.png`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
  },'image/png');
}

fileInput.addEventListener('change',()=>loadFile(fileInput.files?.[0]));
dropZone.addEventListener('dragover',event=>{event.preventDefault();dropZone.classList.add('is-dragging');});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('is-dragging'));
dropZone.addEventListener('drop',event=>{event.preventDefault();dropZone.classList.remove('is-dragging');const file=event.dataTransfer?.files?.[0];if(file)loadFile(file);});
for(const input of[tolerance,softness])input.addEventListener('input',()=>{
  toleranceValue.textContent=tolerance.value;softnessValue.textContent=softness.value;
});
backgroundColor.addEventListener('input',()=>{updateSwatch();clearResult();});
sourceCanvas.addEventListener('click',event=>{
  if(!originalImageData)return;
  const rect=sourceCanvas.getBoundingClientRect();
  const x=Math.min(sourceCanvas.width-1,Math.max(0,Math.floor((event.clientX-rect.left)/rect.width*sourceCanvas.width)));
  const y=Math.min(sourceCanvas.height-1,Math.max(0,Math.floor((event.clientY-rect.top)/rect.height*sourceCanvas.height)));
  const i=(y*sourceCanvas.width+x)*4;
  backgroundColor.value=rgbToHex([originalImageData.data[i],originalImageData.data[i+1],originalImageData.data[i+2]]);
  updateSwatch();clearResult();setStatus('Background color picked from the logo. Run background removal again.');
});
removeBtn.addEventListener('click',processImage);
resetBtn.addEventListener('click',()=>{
  if(!originalImageData)return;
  const auto=detectBackgroundColor(originalImageData.data,sourceCanvas.width,sourceCanvas.height);
  backgroundColor.value=rgbToHex(auto);tolerance.value='22';softness.value='6';
  toleranceValue.textContent='22';softnessValue.textContent='6';updateSwatch();clearResult();
  setStatus('Settings reset to the detected corner background.');
});
downloadBtn.addEventListener('click',downloadResult);
previewBackground.addEventListener('change',applyPreviewBackground);
customPreviewColor.addEventListener('input',applyPreviewBackground);
applyPreviewBackground();updateSwatch();
