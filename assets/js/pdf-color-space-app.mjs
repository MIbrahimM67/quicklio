import{pdfjsLib}from'/assets/js/pdfjs-browser.mjs';
import{scanPdfColorSpaces,scanPdfContentPaintOperators,summarizePageOperatorNames,buildColorReport}from'/assets/js/pdf-color-space-core.mjs';

const $=s=>document.querySelector(s);
const input=$('#pdfInput');
const drop=$('#drop');
const status=$('#status');
const fileMeta=$('#fileMeta');
const results=$('#results');
const opNames=new Map(Object.entries(pdfjsLib.OPS||{}).map(([name,code])=>[code,name]));

function setStatus(message,isError=false){
  status.textContent=message;
  status.classList.toggle('is-error',isError);
}
function bytesLabel(bytes){
  if(bytes<1024)return`${bytes} B`;
  if(bytes<1048576)return`${(bytes/1024).toFixed(1)} KB`;
  return`${(bytes/1048576).toFixed(1)} MB`;
}
function text(value){return String(value??'');}

async function inspectPage(pdf,pageNumber){
  const page=await pdf.getPage(pageNumber);
  const list=await page.getOperatorList();
  const names=list.fnArray.map(code=>opNames.get(code)||'');
  return{page:pageNumber,...summarizePageOperatorNames(names)};
}

function render(report,raw){
  const verdict=$('#verdict');
  verdict.textContent=report.verdict.label;
  verdict.dataset.tone=report.verdict.tone;

  const items=[
    ['Pages',report.pageCount],
    ['RGB',report.verdict.rgb?'Detected':'Not found'],
    ['CMYK',report.verdict.cmyk?'Detected':'Not found'],
    ['Gray',report.verdict.gray?'Detected':'Not found'],
    ['ICC-based',report.verdict.icc?'Detected':'Not found'],
    ['Spot color',report.verdict.spot?'Detected':'Not found']
  ];
  const summary=$('#summaryGrid');
  summary.replaceChildren();
  for(const [label,value] of items){
    const card=document.createElement('article');
    const small=document.createElement('span');small.textContent=label;
    const strong=document.createElement('strong');strong.textContent=text(value);
    card.append(small,strong);summary.append(card);
  }

  const pageRows=$('#pageRows');
  pageRows.replaceChildren();
  for(const page of report.pages){
    const signals=[];
    if(page.rgb)signals.push('RGB');
    if(page.cmyk)signals.push('CMYK');
    if(page.gray)signals.push('Gray');
    const tr=document.createElement('tr');
    for(const value of[page.page,signals.join(', ')||'No direct paint signal',page.rgb,page.cmyk,page.gray]){
      const cell=document.createElement(value===page.page?'th':'td');
      cell.textContent=text(value);tr.append(cell);
    }
    pageRows.append(tr);
  }

  const spaces=$('#declaredSpaces');spaces.replaceChildren();
  const found=Object.entries(raw.counts).filter(([,count])=>count>0);
  if(!found.length){const li=document.createElement('li');li.textContent='No standard color-space declaration tokens were found in readable PDF structure.';spaces.append(li);}
  for(const [name,count] of found){const li=document.createElement('li');li.textContent=`${name}: ${count}`;spaces.append(li);}

  const spots=$('#spotNames');spots.replaceChildren();
  if(!raw.spots.length){const li=document.createElement('li');li.textContent='No named Separation or DeviceN inks found.';spots.append(li);}
  for(const name of raw.spots){const li=document.createElement('li');li.textContent=name;spots.append(li);}

  const print=$('#printSignals');print.replaceChildren();
  const printSignals=[];
  if(raw.hasOutputIntent)printSignals.push('Output intent signal detected');
  if(raw.pdfxVersion)printSignals.push(`PDF/X version: ${raw.pdfxVersion}`);
  if(raw.pdfxConformance)printSignals.push(`PDF/X conformance: ${raw.pdfxConformance}`);
  if(!printSignals.length)printSignals.push('No PDF/X or output-intent signal identified by this lightweight scan.');
  for(const value of printSignals){const li=document.createElement('li');li.textContent=value;print.append(li);}
  results.hidden=false;
}

async function analyze(file){
  if(!file)return;
  if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){setStatus('Choose a PDF file.',true);return;}
  results.hidden=true;
  setStatus('Reading PDF locally…');
  try{
    const bytes=new Uint8Array(await file.arrayBuffer());
    const raw=scanPdfColorSpaces(bytes);
    raw.originalPaint=await scanPdfContentPaintOperators(bytes);
    const pdf=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
    fileMeta.textContent=`${file.name} · ${pdf.numPages} page${pdf.numPages===1?'':'s'} · ${bytesLabel(file.size)}`;
    const pages=[];
    for(let n=1;n<=pdf.numPages;n++){
      setStatus(`Checking page ${n} of ${pdf.numPages}…`);
      pages.push(await inspectPage(pdf,n));
    }
    const report=buildColorReport({fileName:file.name,pageCount:pdf.numPages,raw,pages});
    render(report,raw);
    setStatus('Analysis complete. Nothing was uploaded.');
  }catch(error){
    console.error(error);
    setStatus(`Could not analyze this PDF: ${error?.message||'unknown error'}`,true);
  }
}

input.addEventListener('change',()=>analyze(input.files?.[0]));
drop.addEventListener('click',()=>input.click());
drop.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();input.click();}});
for(const eventName of['dragenter','dragover'])drop.addEventListener(eventName,event=>{event.preventDefault();drop.classList.add('is-drag');});
for(const eventName of['dragleave','drop'])drop.addEventListener(eventName,event=>{event.preventDefault();drop.classList.remove('is-drag');});
drop.addEventListener('drop',event=>{const file=event.dataTransfer?.files?.[0];if(file)analyze(file);});
