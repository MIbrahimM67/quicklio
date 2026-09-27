import{pdfjsLib}from"/assets/js/pdfjs-browser.mjs";
import{BOX_NAMES,toPoints,fromPoints,normalizeBox,boxFromEdges,toPdfBox,insetBox,expandBox,boxesAlmostEqual,validateBoxes}from"/assets/js/pdf-page-box-core.mjs";
import{parsePageRange}from"/assets/js/pdf-suite-core.mjs";

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const getters={MediaBox:"getMediaBox",CropBox:"getCropBox",BleedBox:"getBleedBox",TrimBox:"getTrimBox",ArtBox:"getArtBox"};
const setters={MediaBox:"setMediaBox",CropBox:"setCropBox",BleedBox:"setBleedBox",TrimBox:"setTrimBox",ArtBox:"setArtBox"};
let file=null,bytes=null,pdfDoc=null,pdfjsDoc=null,total=0,currentPage=0,currentUnit="mm",viewport=null,renderTask=null;
const colors={MediaBox:"#222222",CropBox:"#b36b00",BleedBox:"#a13d63",TrimBox:"#217a45",ArtBox:"#365fa0"};

function msg(text,error=false){$("#status").textContent=text;$("#status").className="notice "+(error?"error":"");}
function clean(n){return Math.round(n*1000)/1000}
function readPageBoxes(page){
  const out={};
  for(const name of BOX_NAMES)out[name]=normalizeBox(page[getters[name]]());
  return out;
}
function isExplicit(page,name){
  try{return page.node.has(PDFLib.PDFName.of(name));}catch{return name==="MediaBox";}
}
function formatBox(box,unit=currentUnit){
  const b=normalizeBox(box),f=v=>clean(fromPoints(v,unit));
  return`${f(b.left)}, ${f(b.bottom)}, ${f(b.right)}, ${f(b.top)}`;
}
function setBoxInputs(name,box,unit=currentUnit){
  const b=normalizeBox(box);
  for(const key of["left","bottom","right","top"])$(`[data-box="${name}"][data-edge="${key}"]`).value=String(clean(fromPoints(b[key],unit)));
}
function getBoxInputs(name,unit=currentUnit){
  const vals={};
  for(const key of["left","bottom","right","top"])vals[key]=toPoints($(`[data-box="${name}"][data-edge="${key}"]`).value,unit);
  return boxFromEdges(vals);
}
function enabled(name){return $(`[data-enable="${name}"]`).checked;}
function setEnabled(name,value=true){$(`[data-enable="${name}"]`).checked=value;$(`[data-card="${name}"]`).classList.toggle("is-enabled",value);}
function copyBox(from,to){setBoxInputs(to,getBoxInputs(from));setEnabled(to,true);updatePreviewOverlays();validateDraft();}
function effectiveDraft(){
  const page=pdfDoc.getPage(currentPage),existing=readPageBoxes(page),out={...existing};
  for(const name of BOX_NAMES)if(enabled(name))out[name]=getBoxInputs(name);
  return out;
}
function validateDraft(){
  if(!pdfDoc)return;
  try{
    const issues=validateBoxes(effectiveDraft());
    $("#validation").textContent=issues.length?issues.join(" "):"Box geometry looks valid for the preview page.";
    $("#validation").className="box-validation "+(issues.length?"has-warning":"is-ok");
  }catch(e){$("#validation").textContent=e.message;$("#validation").className="box-validation has-warning";}
}
function populatePage(index){
  currentPage=index;
  const page=pdfDoc.getPage(index),boxes=readPageBoxes(page);
  $("#pageNumber").value=String(index+1);
  $("#pageNumber").max=String(total);
  $("#pageInfo").textContent=`Page ${index+1} of ${total} · rotation ${page.getRotation().angle}°`;
  for(const name of BOX_NAMES){
    setBoxInputs(name,boxes[name]);
    const badge=$(`[data-explicit="${name}"]`),exp=isExplicit(page,name);
    badge.textContent=exp?"explicit":"default / inherited";
    badge.className="box-badge "+(exp?"is-explicit":"");
    $(`[data-current="${name}"]`).textContent=`Current: ${formatBox(boxes[name])}`;
    setEnabled(name,false);
  }
  validateDraft();
  renderPreview(index).catch(e=>{if(e?.name!=="RenderingCancelledException")msg("Preview error: "+e.message,true);});
}
async function renderPreview(index){
  if(!pdfjsDoc)return;
  if(renderTask)try{renderTask.cancel();}catch{}
  const page=await pdfjsDoc.getPage(index+1);
  const base=page.getViewport({scale:1});
  const scale=Math.min(1.35,720/base.width);
  viewport=page.getViewport({scale});
  const canvas=$("#previewCanvas"),ctx=canvas.getContext("2d",{alpha:false});
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const surface=$("#previewSurface");
  surface.style.width=canvas.width+"px";
  surface.style.aspectRatio=`${canvas.width}/${canvas.height}`;
  renderTask=page.render({canvasContext:ctx,viewport});
  await renderTask.promise;
  updatePreviewOverlays();
}
function updatePreviewOverlays(){
  if(!viewport||!pdfDoc)return;
  let boxes;
  try{boxes=effectiveDraft();}catch{return;}
  const canvas=$("#previewCanvas"),sx=canvas.clientWidth/viewport.width,sy=canvas.clientHeight/viewport.height;
  for(const name of BOX_NAMES){
    const el=$(`[data-overlay="${name}"]`),b=boxes[name];
    if(!b){el.hidden=true;continue;}
    const r=viewport.convertToViewportRectangle([b.left,b.bottom,b.right,b.top]);
    const left=Math.min(r[0],r[2])*sx,top=Math.min(r[1],r[3])*sy,width=Math.abs(r[2]-r[0])*sx,height=Math.abs(r[3]-r[1])*sy;
    Object.assign(el.style,{left:left+"px",top:top+"px",width:width+"px",height:height+"px",borderColor:colors[name]});
    el.hidden=false;el.classList.toggle("is-muted",name!=="MediaBox"&&!enabled(name));
  }
}
async function load(f){
  if(!f||!f.name.toLowerCase().endsWith(".pdf"))return msg("Choose a PDF file.",true);
  try{
    file=f;const ab=await f.arrayBuffer();bytes=new Uint8Array(ab);
    pdfDoc=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false});
    total=pdfDoc.getPageCount();
    pdfjsDoc=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
    $("#fileMeta").textContent=`${f.name} · ${total} page${total===1?"":"s"} · ${(f.size/1024/1024).toFixed(2)} MB`;
    $("#workspace").hidden=false;$("#range").placeholder=`All pages (1-${total})`;
    populatePage(0);msg("PDF ready. Inspect a page, enable the boxes you want to change, then export.");
  }catch(e){msg(e?.message||"Could not read this PDF.",true);}
}
function parseForPage(page){
  const boxes=readPageBoxes(page);
  for(const name of BOX_NAMES)if(enabled(name))boxes[name]=getBoxInputs(name);
  return boxes;
}
function applyBoxes(page,boxes){
  for(const name of BOX_NAMES){
    if(!enabled(name))continue;
    const b=toPdfBox(boxes[name]);
    page[setters[name]](b.x,b.y,b.width,b.height);
  }
}
async function process(){
  if(!bytes)return msg("Choose a PDF first.",true);
  const changed=BOX_NAMES.filter(enabled);
  if(!changed.length)return msg("Enable at least one box to change.",true);
  try{
    const selected=parsePageRange($("#range").value,total),doc=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false});
    for(const i of selected){
      const page=doc.getPage(i),draft=parseForPage(page);
      applyBoxes(page,draft);
      const actual=readPageBoxes(page),issues=validateBoxes(actual);
      if(issues.some(x=>x.includes("extends outside MediaBox")))throw Error(`Page ${i+1}: ${issues.join(" ")}`);
    }
    doc.setProducer("Quicklio — PDF Page Box Editor");
    const result=await doc.save({useObjectStreams:false});
    const verify=await PDFLib.PDFDocument.load(result,{updateMetadata:false});
    for(const i of selected){
      const page=verify.getPage(i),actual=readPageBoxes(page);
      for(const name of changed){
        const intended=getBoxInputs(name);
        if(!boxesAlmostEqual(actual[name],intended))throw Error(`Verification failed for ${name} on page ${i+1}.`);
      }
    }
    const url=URL.createObjectURL(new Blob([result],{type:"application/pdf"})),a=document.createElement("a");
    a.href=url;a.download=(file.name.replace(/\.pdf$/i,"")||"document")+"-page-boxes.pdf";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
    msg(`Verified and downloaded. Updated ${changed.join(", ")} on ${selected.length} page${selected.length===1?"":"s"}.`);
  }catch(e){msg(e?.message||"Could not update page boxes.",true);}
}

$("#drop").addEventListener("click",()=>$("#pdfInput").click());
$("#drop").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();$("#pdfInput").click();}});
$("#drop").addEventListener("dragover",e=>{e.preventDefault();$("#drop").classList.add("is-drag");});
$("#drop").addEventListener("dragleave",()=>$("#drop").classList.remove("is-drag"));
$("#drop").addEventListener("drop",e=>{e.preventDefault();$("#drop").classList.remove("is-drag");load(e.dataTransfer.files[0]);});
$("#pdfInput").addEventListener("change",e=>load(e.target.files[0]));
$("#pageNumber").addEventListener("change",()=>{const n=Math.max(1,Math.min(total,Number($("#pageNumber").value)||1));populatePage(n-1);});
$("#prevPage").addEventListener("click",()=>populatePage(Math.max(0,currentPage-1)));
$("#nextPage").addEventListener("click",()=>populatePage(Math.min(total-1,currentPage+1)));
$("#unit").addEventListener("change",()=>{
  if(!pdfDoc){currentUnit=$("#unit").value;return;}
  const old=currentUnit,boxes={};
  try{for(const name of BOX_NAMES)boxes[name]=getBoxInputs(name,old);}catch{return;}
  currentUnit=$("#unit").value;
  for(const name of BOX_NAMES){setBoxInputs(name,boxes[name],currentUnit);$(`[data-current="${name}"]`).textContent=`Current/draft: ${formatBox(boxes[name],currentUnit)}`;}
  validateDraft();updatePreviewOverlays();
});
$$('[data-enable]').forEach(el=>el.addEventListener("change",()=>{setEnabled(el.dataset.enable,el.checked);validateDraft();updatePreviewOverlays();}));
$$('[data-box]').forEach(el=>el.addEventListener("input",()=>{setEnabled(el.dataset.box,true);validateDraft();updatePreviewOverlays();}));
$("#presetCropMedia").addEventListener("click",()=>copyBox("MediaBox","CropBox"));
$("#presetTrimCrop").addEventListener("click",()=>copyBox("CropBox","TrimBox"));
$("#presetTrimInset").addEventListener("click",()=>{try{const amount=toPoints($("#trimInset").value,currentUnit),b=insetBox(getBoxInputs("MediaBox"),amount);setBoxInputs("TrimBox",b);setEnabled("TrimBox",true);validateDraft();updatePreviewOverlays();}catch(e){msg(e.message,true);}});
$("#presetBleed").addEventListener("click",()=>{try{const amount=toPoints($("#bleedAmount").value,currentUnit),b=expandBox(getBoxInputs("TrimBox"),amount);setBoxInputs("BleedBox",b);setEnabled("BleedBox",true);validateDraft();updatePreviewOverlays();}catch(e){msg(e.message,true);}});
$("#processBtn").addEventListener("click",process);
new ResizeObserver(()=>updatePreviewOverlays()).observe($("#previewCanvas"));
