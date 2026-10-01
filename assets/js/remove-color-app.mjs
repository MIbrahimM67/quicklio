import{removeSelectedColor,rgbToHex,hexToRgb}from'/assets/js/remove-color-core.mjs';

const $=s=>document.querySelector(s);
const fileInput=$('#fileInput'),dropZone=$('#dropZone'),sourceCanvas=$('#sourceCanvas'),resultCanvas=$('#resultCanvas');
const sourceCtx=sourceCanvas.getContext('2d',{willReadFrequently:true}),resultCtx=resultCanvas.getContext('2d');
const targetColor=$('#targetColor'),swatch=$('#pickedSwatch'),tolerance=$('#tolerance'),softness=$('#softness');
const toleranceValue=$('#toleranceValue'),softnessValue=$('#softnessValue'),removeBtn=$('#removeBtn'),resetBtn=$('#resetBtn'),downloadBtn=$('#downloadBtn');
const status=$('#status'),fileMeta=$('#fileMeta'),resultPanel=$('#resultPanel'),resultMeta=$('#resultMeta'),previewBackground=$('#previewBackground'),customPreviewColor=$('#customPreviewColor'),resultStage=$('#resultStage');
let originalImageData=null,lastFileName='image',objectUrl=null;

function setStatus(text,type=''){status.textContent=text;status.className='status-line'+(type?' '+type:'');}
function formatBytes(bytes){if(bytes<1024)return bytes+' B';if(bytes<1024*1024)return(bytes/1024).toFixed(1)+' KB';return(bytes/1024/1024).toFixed(1)+' MB';}
function resizeCanvas(canvas,w,h){canvas.width=w;canvas.height=h;}
function updateSwatch(){swatch.style.background=targetColor.value;swatch.title='Selected color '+targetColor.value;}
function clearResult(){resultPanel.hidden=true;downloadBtn.disabled=true;resultCanvas.width=1;resultCanvas.height=1;}
function applyPreviewBackground(){const v=previewBackground.value;resultStage.dataset.preview=v;if(v==='custom')resultStage.style.setProperty('--preview-bg',customPreviewColor.value);else resultStage.style.removeProperty('--preview-bg');customPreviewColor.hidden=v!=='custom';}
function pickPixel(clientX,clientY){
  if(!originalImageData)return;
  const rect=sourceCanvas.getBoundingClientRect();
  const x=Math.min(sourceCanvas.width-1,Math.max(0,Math.floor((clientX-rect.left)/Math.max(1,rect.width)*sourceCanvas.width)));
  const y=Math.min(sourceCanvas.height-1,Math.max(0,Math.floor((clientY-rect.top)/Math.max(1,rect.height)*sourceCanvas.height)));
  const i=(y*sourceCanvas.width+x)*4;
  targetColor.value=rgbToHex([originalImageData.data[i],originalImageData.data[i+1],originalImageData.data[i+2]]);updateSwatch();clearResult();setStatus(`Picked ${targetColor.value.toUpperCase()} from the image. Adjust tolerance if needed, then remove the color.`);
}

async function loadFile(file){
  clearResult();originalImageData=null;
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setStatus('Choose a PNG, JPG/JPEG, or WebP image.','error');return;}
  if(file.size>20*1024*1024){setStatus('This file is over 20 MB. Choose a smaller image.','error');return;}
  if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);
  const img=new Image();img.decoding='async';img.src=objectUrl;
  try{await img.decode();}catch{setStatus('Quicklio could not decode this image.','error');return;}
  const pixels=img.naturalWidth*img.naturalHeight;if(pixels>12000000){setStatus('This image is over 12 megapixels. Resize it first for reliable browser processing.','error');return;}
  resizeCanvas(sourceCanvas,img.naturalWidth,img.naturalHeight);sourceCtx.clearRect(0,0,sourceCanvas.width,sourceCanvas.height);sourceCtx.drawImage(img,0,0);originalImageData=sourceCtx.getImageData(0,0,sourceCanvas.width,sourceCanvas.height);
  const i=((Math.floor(sourceCanvas.height/2)*sourceCanvas.width)+Math.floor(sourceCanvas.width/2))*4;targetColor.value=rgbToHex([originalImageData.data[i],originalImageData.data[i+1],originalImageData.data[i+2]]);updateSwatch();
  lastFileName=(file.name.replace(/\.[^.]+$/,'')||'image').replace(/[^a-z0-9_-]+/gi,'-');fileMeta.textContent=`${file.name} · ${img.naturalWidth} × ${img.naturalHeight}px · ${formatBytes(file.size)}`;removeBtn.disabled=false;resetBtn.disabled=false;
  setStatus('Image loaded. Click any color in the original image to choose what to remove, or use the color picker.');
}

function processImage(){
  if(!originalImageData)return;
  removeBtn.disabled=true;setStatus('Removing the selected color…');
  requestAnimationFrame(()=>{
    try{
      const result=removeSelectedColor({data:originalImageData.data,width:sourceCanvas.width,height:sourceCanvas.height,target:hexToRgb(targetColor.value),tolerance:Number(tolerance.value),softness:Number(softness.value)});
      resizeCanvas(resultCanvas,sourceCanvas.width,sourceCanvas.height);resultCtx.putImageData(new ImageData(result.data,sourceCanvas.width,sourceCanvas.height),0,0);
      const affected=Math.round(result.affectedPixels/result.totalPixels*1000)/10,transparent=Math.round(result.fullyTransparentPixels/result.totalPixels*1000)/10;
      resultMeta.textContent=`${sourceCanvas.width} × ${sourceCanvas.height}px · ${affected}% affected · ${transparent}% fully transparent`;
      resultPanel.hidden=false;downloadBtn.disabled=false;setStatus('Transparent PNG ready. If too much or too little was removed, adjust Tolerance or Edge softness and run it again.','success');
    }catch(error){setStatus(error?.message||'Could not process this image.','error');}
    finally{removeBtn.disabled=false;}
  });
}
function downloadResult(){if(downloadBtn.disabled)return;resultCanvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${lastFileName}-color-removed.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);},'image/png');}

fileInput.addEventListener('change',()=>loadFile(fileInput.files?.[0]));
dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('is-dragging');});dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('is-dragging'));dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('is-dragging');const f=e.dataTransfer?.files?.[0];if(f)loadFile(f);});
sourceCanvas.addEventListener('click',e=>pickPixel(e.clientX,e.clientY));targetColor.addEventListener('input',()=>{updateSwatch();clearResult();});
for(const input of[tolerance,softness])input.addEventListener('input',()=>{toleranceValue.textContent=tolerance.value;softnessValue.textContent=softness.value;clearResult();});
removeBtn.addEventListener('click',processImage);resetBtn.addEventListener('click',()=>{if(!originalImageData)return;tolerance.value='18';softness.value='4';toleranceValue.textContent='18';softnessValue.textContent='4';clearResult();setStatus('Tolerance and edge softness reset. Pick a color and run removal again.');});downloadBtn.addEventListener('click',downloadResult);previewBackground.addEventListener('change',applyPreviewBackground);customPreviewColor.addEventListener('input',applyPreviewBackground);
applyPreviewBackground();updateSwatch();
