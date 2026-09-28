import{pdfjsLib}from'/assets/js/pdfjs-browser.mjs';
import{parsePageRange}from'/assets/js/pdf-suite-core.mjs';
import{textItemsToLines,linesToParagraphs,analyzeTextPage,ocrTextToParagraphs,buildDocxParts}from'/assets/js/pdf-to-word-core.mjs';
const $=s=>document.querySelector(s);
let file=null,bytes=null,pdf=null,total=0,analysis=null,analysisKey='';
function msg(text,error=false){const el=$('#status');el.textContent=text;el.className='notice '+(error?'error':'');}
function setProgress(text,value=null){$('#progressText').textContent=text;const bar=$('#progressBar');if(value===null){bar.hidden=true;bar.value=0}else{bar.hidden=false;bar.value=Math.max(0,Math.min(100,value));}}
function optionKey(){return[$('#range').value.trim(),$('#ocrScans').checked?'ocr':'text'].join('|')}
function resetAnalysis(){analysis=null;analysisKey='';$('#results').hidden=true;$('#convertBtn').disabled=true;$('#previewText').textContent='';$('#qualityList').innerHTML='';}
function safeBaseName(name){return(name.replace(/\.pdf$/i,'').trim()||'document').replace(/[<>:"/\\|?*\u0000-\u001F]/g,'-').slice(0,120)}
async function load(f){
  if(!f||(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf'))return msg('Choose a PDF file.',true);
  try{
    msg('Reading PDF…');resetAnalysis();file=f;bytes=new Uint8Array(await f.arrayBuffer());
    pdf=await pdfjsLib.getDocument({data:bytes.slice()}).promise;total=pdf.numPages;
    $('#workspace').hidden=false;$('#fileMeta').textContent=`${f.name} · ${total} page${total===1?'':'s'} · ${(f.size/1024/1024).toFixed(f.size>1024*1024?1:2)} MB`;
    $('#range').placeholder=`All ${total} pages`;msg('PDF ready. Analyze it before conversion.');setProgress('Ready.');
  }catch(e){pdf=null;msg(e?.message||'Could not read this PDF.',true)}
}
$('#pdfInput').addEventListener('change',e=>load(e.target.files[0]));
$('#drop').addEventListener('click',()=>$('#pdfInput').click());
$('#drop').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#pdfInput').click()}});
$('#drop').addEventListener('dragover',e=>{e.preventDefault();$('#drop').classList.add('is-drag')});
$('#drop').addEventListener('dragleave',()=>$('#drop').classList.remove('is-drag'));
$('#drop').addEventListener('drop',e=>{e.preventDefault();$('#drop').classList.remove('is-drag');load(e.dataTransfer.files[0])});
for(const id of['range','ocrScans'])$('#'+id).addEventListener('change',resetAnalysis);
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
  const ctx=canvas.getContext('2d',{alpha:false});await page.render({canvasContext:ctx,viewport}).promise;
  setProgress(`OCR page ${pageNumber}…`,progressBase+progressSpan*.1);
  const result=await Tesseract.recognize(canvas,'eng',{logger:m=>{if(m.status==='recognizing text'&&Number.isFinite(m.progress))setProgress(`OCR page ${pageNumber}: ${Math.round(m.progress*100)}%`,progressBase+progressSpan*(.1+.9*m.progress))}});
  return ocrTextToParagraphs(result?.data?.text||'');
}
async function analyzeDocument(){
  if(!pdf)throw Error('Choose a PDF first.');
  const selected=parsePageRange($('#range').value,total);
  if(!selected.length)throw Error('Choose at least one page.');
  const useOcr=$('#ocrScans').checked;const pages=[];let ocrCount=0,scanCount=0,complexCount=0,textPages=0;
  for(let n=0;n<selected.length;n++){
    const index=selected[n],pageNumber=index+1,page=await pdf.getPage(pageNumber);
    const start=n/selected.length*100,span=100/selected.length;
    setProgress(`Analyzing page ${pageNumber}…`,start);
    const content=await page.getTextContent();
    const lines=textItemsToLines(content.items);const viewport=page.getViewport({scale:1});const diag=analyzeTextPage(lines,viewport.width);
    let paragraphs=linesToParagraphs(lines),usedOcr=false;
    if(diag.scannedLikely){
      scanCount++;
      if(useOcr){paragraphs=await ocrPage(page,pageNumber,start,span);usedOcr=true;ocrCount++;}
    }else textPages++;
    if(diag.complexLayout)complexCount++;
    pages.push({pageNumber,paragraphs,diag,usedOcr});
    setProgress(`Analyzed ${n+1} of ${selected.length} pages`,(n+1)/selected.length*100);
  }
  analysis={pages,selectedCount:selected.length,ocrCount,scanCount,complexCount,textPages};analysisKey=optionKey();renderAnalysis();return analysis;
}
function renderAnalysis(){
  const a=analysis;if(!a)return;
  $('#results').hidden=false;$('#convertBtn').disabled=false;
  $('#summary').innerHTML=`<div><strong>${a.selectedCount}</strong><span>pages selected</span></div><div><strong>${a.textPages}</strong><span>text pages</span></div><div><strong>${a.scanCount}</strong><span>scan-like pages</span></div><div><strong>${a.complexCount}</strong><span>layout warnings</span></div>`;
  const list=$('#qualityList');list.innerHTML='';
  for(const p of a.pages){
    const li=document.createElement('li');
    const state=p.usedOcr?'OCR used':p.diag.scannedLikely?'No selectable text':p.diag.complexLayout?'Review layout':'Good text extraction';
    li.innerHTML=`<strong>Page ${p.pageNumber}</strong><span>${state}</span><small>${p.diag.charCount.toLocaleString()} selectable characters${p.diag.complexLayout?' · possible columns/tables':''}</small>`;list.append(li);
  }
  const preview=a.pages.flatMap(p=>[`--- Page ${p.pageNumber}${p.usedOcr?' (OCR)':''} ---`,...(p.paragraphs||[]).map(x=>x.text)]).join('\n\n');
  $('#previewText').textContent=preview||'No editable text was found in the selected pages.';
  const missing=a.pages.filter(p=>p.diag.scannedLikely&&!p.usedOcr).length;
  if(missing)msg(`${missing} selected page${missing===1?' has':'s have'} no selectable text. Turn on OCR for scanned pages if needed.`,true);
  else if(a.complexCount)msg('Analysis complete. Some pages may contain columns or table-like spacing; review the preview before converting.');
  else msg('Analysis complete. The selected pages are ready to convert.');
}
$('#analyzeBtn').addEventListener('click',async()=>{try{await analyzeDocument()}catch(e){msg(e?.message||'Could not analyze this PDF.',true);setProgress('Analysis stopped.')}});

async function makeDocx(){
  if(!analysis||analysisKey!==optionKey())await analyzeDocument();
  const pages=analysis.pages.map(p=>({paragraphs:p.paragraphs,label:$('#pageLabels').checked?`PDF page ${p.pageNumber}`:''}));
  const title=safeBaseName(file.name);const parts=buildDocxParts(pages,title);const zip=new JSZip();
  for(const[path,content]of Object.entries(parts))zip.file(path,content);
  setProgress('Building Word document…',96);
  const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE',compressionOptions:{level:6}});
  const check=await JSZip.loadAsync(blob);if(!check.file('word/document.xml')||!check.file('[Content_Types].xml'))throw Error('The Word package could not be verified.');
  const documentXml=await check.file('word/document.xml').async('string');if(!documentXml.includes('<w:document'))throw Error('The Word document structure could not be verified.');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=title+'-converted.docx';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
  setProgress('Word document created.',100);msg('Editable DOCX downloaded. Review complex formatting before relying on it.');
}
$('#convertBtn').addEventListener('click',async()=>{try{$('#convertBtn').disabled=true;await makeDocx()}catch(e){msg(e?.message||'Could not create the Word document.',true);setProgress('Conversion stopped.')}finally{$('#convertBtn').disabled=false}});
