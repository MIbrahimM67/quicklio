import{pdfjsLib}from'/assets/js/pdfjs-browser.mjs';
import{parsePageRange}from'/assets/js/pdf-suite-core.mjs';
import{textItemsToLines,linesToParagraphs,analyzeTextPage,ocrTextToParagraphs,buildDocxParts}from'/assets/js/pdf-to-word-core.mjs';
const $=s=>document.querySelector(s);
let file=null,bytes=null,pdf=null,total=0,analysis=null,analysisKey='';
function msg(text,error=false){const el=$('#status');el.textContent=text;el.className='notice '+(error?'error':'');}
function setProgress(text,value=null){$('#progressText').textContent=text;const bar=$('#progressBar');if(value===null){bar.hidden=true;bar.value=0}else{bar.hidden=false;bar.value=Math.max(0,Math.min(100,value));}}
function mode(){return $('#conversionMode')?.value||'editable'}
function optionKey(){return[$('#range').value.trim(),$('#ocrScans').checked?'ocr':'text',mode()].join('|')}
function resetAnalysis(){analysis=null;analysisKey='';$('#results').hidden=true;$('#convertBtn').disabled=true;$('#previewText').textContent='';$('#qualityList').innerHTML='';}
function safeBaseName(name){return(name.replace(/\.pdf$/i,'').trim()||'document').replace(/[<>:"/\\|?*\u0000-\u001F]/g,'-').slice(0,120)}
function refreshModeHelp(){
  const layout=mode()==='layout';
  const help=$('#modeHelp');if(help)help.textContent=layout?'Preserves images, diagrams, charts, fonts, columns, and page appearance by placing a high-quality snapshot of each PDF page into Word. The page itself is not individually editable.':'Reconstructs editable Word text and preserves page size, headings, alignment, indentation, and spacing where the PDF exposes enough information. Images and complex graphics may not remain in the editable flow.';
  const ocr=$('#ocrScans');if(ocr){ocr.disabled=layout;ocr.closest('label')?.classList.toggle('is-disabled',layout)}
  const labels=$('#pageLabels');if(labels){labels.disabled=layout;labels.closest('label')?.classList.toggle('is-disabled',layout)}
}
async function load(f){
  if(!f||(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf'))return msg('Choose a PDF file.',true);
  try{
    msg('Reading PDF…');resetAnalysis();file=f;bytes=new Uint8Array(await f.arrayBuffer());
    pdf=await pdfjsLib.getDocument({data:bytes.slice()}).promise;total=pdf.numPages;
    $('#workspace').hidden=false;$('#fileMeta').textContent=`${f.name} · ${total} page${total===1?'':'s'} · ${(f.size/1024/1024).toFixed(f.size>1024*1024?1:2)} MB`;
    $('#range').placeholder=`All ${total} pages`;msg('PDF ready. Analyze it before conversion.');setProgress('Ready.');refreshModeHelp();
  }catch(e){pdf=null;msg(e?.message||'Could not read this PDF.',true)}
}
$('#pdfInput').addEventListener('change',e=>load(e.target.files[0]));
$('#drop').addEventListener('click',()=>$('#pdfInput').click());
$('#drop').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#pdfInput').click()}});
$('#drop').addEventListener('dragover',e=>{e.preventDefault();$('#drop').classList.add('is-drag')});
$('#drop').addEventListener('dragleave',()=>$('#drop').classList.remove('is-drag'));
$('#drop').addEventListener('drop',e=>{e.preventDefault();$('#drop').classList.remove('is-drag');load(e.dataTransfer.files[0])});
for(const id of['range','ocrScans','conversionMode'])$('#'+id)?.addEventListener('change',()=>{resetAnalysis();refreshModeHelp()});
$('#range').addEventListener('input',resetAnalysis);

let tesseractPromise=null;
function loadTesseract(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  if(tesseractPromise)return tesseractPromise;
  tesseractPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';s.crossOrigin='anonymous';
    s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(Error('OCR library did not load.'));
    s.onerror=()=>reject(Error('Could not load the OCR library. Check your connection and try again.'));
    document.head.append(s);
  });
  return tesseractPromise;
}
async function ocrPage(page,pageNumber,progressBase,progressSpan){
  const Tesseract=await loadTesseract();
  const viewport=page.getViewport({scale:1.65});
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);await page.render({canvasContext:ctx,viewport}).promise;
  setProgress(`OCR page ${pageNumber}…`,progressBase+progressSpan*.1);
  const result=await Tesseract.recognize(canvas,'eng',{logger:m=>{if(m.status==='recognizing text'&&Number.isFinite(m.progress))setProgress(`OCR page ${pageNumber}: ${Math.round(m.progress*100)}%`,progressBase+progressSpan*(.1+.9*m.progress))}});
  return ocrTextToParagraphs(result?.data?.text||'');
}
function visualSignals(operatorList){
  const ops=pdfjsLib.OPS||{};const imageOps=new Set([ops.paintImageXObject,ops.paintInlineImageXObject,ops.paintImageMaskXObject,ops.paintJpegXObject].filter(Number.isFinite));
  const pathOps=new Set([ops.constructPath,ops.paintFormXObjectBegin].filter(Number.isFinite));
  let images=0,vectorOps=0;
  for(const fn of operatorList?.fnArray||[]){if(imageOps.has(fn))images++;if(pathOps.has(fn))vectorOps++}
  return{images,vectorOps,hasVisuals:images>0||vectorOps>=3};
}
async function analyzeDocument(){
  if(!pdf)throw Error('Choose a PDF first.');
  const selected=parsePageRange($('#range').value,total);
  if(!selected.length)throw Error('Choose at least one page.');
  const useOcr=$('#ocrScans').checked&&mode()!=='layout';const pages=[];let ocrCount=0,scanCount=0,complexCount=0,textPages=0,visualPages=0;
  for(let n=0;n<selected.length;n++){
    const index=selected[n],pageNumber=index+1,page=await pdf.getPage(pageNumber);
    const start=n/selected.length*100,span=100/selected.length;
    setProgress(`Analyzing page ${pageNumber}…`,start);
    const [content,operatorList]=await Promise.all([page.getTextContent(),page.getOperatorList()]);
    const viewport=page.getViewport({scale:1});const lines=textItemsToLines(content.items);const diag=analyzeTextPage(lines,viewport.width);const visuals=visualSignals(operatorList);
    let paragraphs=linesToParagraphs(lines,viewport.width),usedOcr=false;
    if(diag.scannedLikely){
      scanCount++;
      if(useOcr){paragraphs=await ocrPage(page,pageNumber,start,span);usedOcr=true;ocrCount++;}
    }else textPages++;
    if(diag.complexLayout)complexCount++;if(visuals.hasVisuals)visualPages++;
    pages.push({pageNumber,paragraphs,diag,usedOcr,visuals,widthPt:viewport.width,heightPt:viewport.height});
    setProgress(`Analyzed ${n+1} of ${selected.length} pages`,(n+1)/selected.length*100);
  }
  analysis={pages,selectedCount:selected.length,ocrCount,scanCount,complexCount,textPages,visualPages};analysisKey=optionKey();renderAnalysis();return analysis;
}
function renderAnalysis(){
  const a=analysis;if(!a)return;const layout=mode()==='layout';
  $('#results').hidden=false;$('#convertBtn').disabled=false;
  $('#summary').innerHTML=`<div><strong>${a.selectedCount}</strong><span>pages selected</span></div><div><strong>${a.textPages}</strong><span>text pages</span></div><div><strong>${a.visualPages}</strong><span>visual pages</span></div><div><strong>${a.complexCount}</strong><span>layout warnings</span></div>`;
  const callout=$('#qualityCallout');if(callout)callout.innerHTML=layout?'Preserve Layout mode keeps <strong>images, diagrams, charts, vector artwork, columns, and page appearance</strong> by rendering each selected PDF page into the Word document. The visual page is faithful, but its individual text and graphics are not separately editable.':'Editable Text mode reconstructs <strong>editable Word text</strong> and now keeps more page size, heading, alignment, indentation, and spacing information. Pages with images, diagrams, or complex columns may still differ from the PDF; switch to Preserve Layout when visual fidelity matters more than editability.';
  const list=$('#qualityList');list.innerHTML='';
  for(const p of a.pages){
    const li=document.createElement('li');
    const state=layout?'Layout will be preserved':p.usedOcr?'OCR used':p.diag.scannedLikely?'No selectable text':p.diag.complexLayout?'Review layout':'Good text extraction';
    const visual=p.visuals.hasVisuals?` · ${p.visuals.images?`${p.visuals.images} image object${p.visuals.images===1?'':'s'}`:'graphics detected'}`:'';
    li.innerHTML=`<strong>Page ${p.pageNumber}</strong><span>${state}</span><small>${p.diag.charCount.toLocaleString()} selectable characters${p.diag.complexLayout?' · possible columns/tables':''}${visual}</small>`;list.append(li);
  }
  const preview=a.pages.flatMap(p=>[`--- Page ${p.pageNumber}${p.usedOcr?' (OCR)':''} ---`,...(p.paragraphs||[]).map(x=>x.text)]).join('\n\n');
  $('#previewText').textContent=preview||'No editable text was found in the selected pages.';
  if(layout){msg(a.visualPages?`Analysis complete. Preserve Layout will keep the visual content on ${a.visualPages} page${a.visualPages===1?'':'s'}.`:'Analysis complete. Preserve Layout will reproduce each selected PDF page inside Word.');return}
  const missing=a.pages.filter(p=>p.diag.scannedLikely&&!p.usedOcr).length;
  if(missing)msg(`${missing} selected page${missing===1?' has':'s have'} no selectable text. Turn on OCR for scanned pages if needed.`,true);
  else if(a.visualPages||a.complexCount)msg('Analysis complete. Some pages contain visuals or complex layout; use Preserve Layout mode if appearance matters more than editability.');
  else msg('Analysis complete. The selected pages are ready to convert.');
}
$('#analyzeBtn').addEventListener('click',async()=>{try{await analyzeDocument()}catch(e){msg(e?.message||'Could not analyze this PDF.',true);setProgress('Analysis stopped.')}});

function canvasToPng(canvas){return new Promise((resolve,reject)=>canvas.toBlob(async blob=>blob?resolve(new Uint8Array(await blob.arrayBuffer())):reject(Error('Could not render a page image.')),'image/png'))}
async function renderLayoutPage(page,pageNumber,index,count){
  const baseViewport=page.getViewport({scale:1});
  const maxSide=count>40?1500:count>15?1800:2100;
  const scale=Math.max(1,Math.min(1.8,maxSide/Math.max(baseViewport.width,baseViewport.height)));
  const viewport=page.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  setProgress(`Rendering page ${pageNumber} for layout…`,5+index/count*86);
  await page.render({canvasContext:ctx,viewport}).promise;
  const data=await canvasToPng(canvas);
  canvas.width=1;canvas.height=1;
  return{data,pixelWidth:viewport.width,pixelHeight:viewport.height,widthPt:baseViewport.width,heightPt:baseViewport.height};
}
async function makeDocx(){
  if(!analysis||analysisKey!==optionKey())await analyzeDocument();
  const outputMode=mode();const title=safeBaseName(file.name);const zip=new JSZip();let pages;
  if(outputMode==='layout'){
    pages=[];
    for(let i=0;i<analysis.pages.length;i++){
      const info=analysis.pages[i],page=await pdf.getPage(info.pageNumber),rendered=await renderLayoutPage(page,info.pageNumber,i,analysis.pages.length);
      const imageName=`page-${String(i+1).padStart(3,'0')}.png`,imageRelId=`rIdImage${i+1}`;
      pages.push({pageNumber:info.pageNumber,widthPt:rendered.widthPt,heightPt:rendered.heightPt,imagePixelWidth:rendered.pixelWidth,imagePixelHeight:rendered.pixelHeight,imageName,imageRelId,imageData:rendered.data});
    }
    const parts=buildDocxParts(pages,title,{mode:'layout'});for(const[path,content]of Object.entries(parts))zip.file(path,content);
    for(const p of pages)zip.file(`word/media/${p.imageName}`,p.imageData,{binary:true});
  }else{
    pages=analysis.pages.map(p=>({paragraphs:p.paragraphs,label:$('#pageLabels').checked?`PDF page ${p.pageNumber}`:'',widthPt:p.widthPt,heightPt:p.heightPt}));
    const parts=buildDocxParts(pages,title,{mode:'editable'});for(const[path,content]of Object.entries(parts))zip.file(path,content);
  }
  setProgress('Building Word document…',96);
  const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE',compressionOptions:{level:6}});
  const check=await JSZip.loadAsync(blob);if(!check.file('word/document.xml')||!check.file('[Content_Types].xml'))throw Error('The Word package could not be verified.');
  const documentXml=await check.file('word/document.xml').async('string');if(!documentXml.includes('<w:document'))throw Error('The Word document structure could not be verified.');
  if(outputMode==='layout'&&!check.file('word/media/page-001.png'))throw Error('The layout-preserved Word package is missing its page images.');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=title+'-converted.docx';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
  setProgress('Word document created.',100);
  msg(outputMode==='layout'?'Layout-preserved DOCX downloaded. Images, diagrams, charts, and page appearance are retained as high-quality page snapshots.':'Editable DOCX downloaded. Quicklio preserved more page sizing, alignment, indentation, and spacing; review complex layouts before relying on them.');
}
$('#convertBtn').addEventListener('click',async()=>{try{$('#convertBtn').disabled=true;await makeDocx()}catch(e){msg(e?.message||'Could not create the Word document.',true);setProgress('Conversion stopped.')}finally{$('#convertBtn').disabled=false}});
refreshModeHelp();
