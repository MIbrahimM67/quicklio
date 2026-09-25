import{analyzeSvgText,CRICUT_SVG_PATH_LIMIT}from"/assets/js/cricut-svg-core.mjs";

const $=s=>document.querySelector(s);
const fileInput=$("#svgFile"),drop=$("#svgDrop"),result=$("#svgResult"),findings=$("#svgFindings"),preview=$("#svgPreview");
let previewUrl=null;

function fmt(n){return new Intl.NumberFormat("en-US").format(n)}
function bytes(n){
  if(!Number.isFinite(n)||n<=0)return"—";
  if(n<1024)return n+" B";
  if(n<1024*1024)return(n/1024).toFixed(n<10240?1:0)+" KB";
  return(n/1024/1024).toFixed(2)+" MB";
}
function setStatus(text,error=false){
  const el=$("#svgStatus");
  el.textContent=text;
  el.className="notice"+(error?" error":"");
}
function clearPreview(){
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=null;
  preview.removeAttribute("src");
  preview.hidden=true;
  $("#previewEmpty").hidden=false;
}
function sanitizeForPreview(text){
  const parser=new DOMParser();
  const doc=parser.parseFromString(text,"image/svg+xml");
  if(doc.querySelector("parsererror"))throw Error("The SVG XML could not be parsed.");
  const svg=doc.documentElement;
  if(svg.localName.toLowerCase()!=="svg")throw Error("The file does not have an SVG root element.");
  svg.querySelectorAll("script,foreignObject,image,style").forEach(el=>el.remove());
  for(const el of svg.querySelectorAll("*")){
    for(const a of[...el.attributes]){
      const name=a.name.toLowerCase(),value=a.value.trim();
      if(name.startsWith("on"))el.removeAttribute(a.name);
      if((name==="href"||name==="xlink:href")&&value&&!value.startsWith("#"))el.removeAttribute(a.name);
      if((name==="style"||name==="fill"||name==="stroke")&&/url\(\s*['"]?https?:/i.test(value))el.removeAttribute(a.name);
    }
  }
  return new XMLSerializer().serializeToString(svg);
}
function renderPreview(text){
  clearPreview();
  try{
    const safe=sanitizeForPreview(text);
    previewUrl=URL.createObjectURL(new Blob([safe],{type:"image/svg+xml"}));
    preview.src=previewUrl;
    preview.hidden=false;
    $("#previewEmpty").hidden=true;
  }catch{
    $("#previewEmpty").textContent="Preview unavailable for this SVG.";
  }
}
function detailRow(label,value){
  const row=document.createElement("div");
  row.className="svg-detail";
  const a=document.createElement("span"),b=document.createElement("strong");
  a.textContent=label;b.textContent=value;
  row.append(a,b);
  return row;
}
function renderFindings(report){
  findings.innerHTML="";
  const items=report.issues.length?report.issues:[{
    severity:"success",source:"Quicklio",title:"No blocker found in the checks above",
    detail:"The file is under Cricut's documented 5,000-path limit and Quicklio did not detect the unsupported SVG items covered by Cricut's cited help guidance. Design Space is still the final upload check."
  }];
  for(const item of items){
    const li=document.createElement("li");
    li.className="svg-finding "+item.severity;
    const top=document.createElement("div"),badge=document.createElement("span"),title=document.createElement("strong"),p=document.createElement("p");
    top.className="svg-finding-top";
    badge.className="svg-badge";
    badge.textContent=item.severity==="error"?"Blocker":item.severity==="warning"?"Review":"Pass";
    title.textContent=item.title;
    top.append(badge,title);
    p.textContent=item.detail;
    li.append(top,p);
    if(item.source==="Quicklio"){
      const source=document.createElement("small");
      source.textContent="Quicklio caution — not presented as an official Cricut rule.";
      li.append(source);
    }
    findings.append(li);
  }
}
function render(report,file){
  result.hidden=false;
  result.dataset.state=report.state;
  $("#svgResultTitle").textContent=report.title;
  $("#svgResultBody").textContent=report.state==="fail"
    ?"Fix the blocker(s) below before relying on this file in Design Space."
    :report.state==="review"
      ?"The documented path limit passes, but the file contains features worth checking before upload."
      :"The checks Quicklio can verify did not find a documented Cricut upload blocker.";

  $("#pathCount").textContent=fmt(report.counts.path)+" / "+fmt(CRICUT_SVG_PATH_LIMIT);
  $("#geometryCount").textContent=fmt(report.counts.geometry);
  $("#groupCount").textContent=fmt(report.counts.group);
  $("#fileSize").textContent=bytes(file.size);

  const meter=$("#pathMeter");
  meter.max=CRICUT_SVG_PATH_LIMIT;
  meter.value=Math.min(report.counts.path,CRICUT_SVG_PATH_LIMIT);
  $("#pathMeterText").textContent=report.counts.path>CRICUT_SVG_PATH_LIMIT
    ?fmt(report.summary.overBy)+" explicit paths over Cricut's documented limit."
    :fmt(report.summary.remainingPaths)+" explicit paths remain before the documented 5,000-path limit.";

  const dims=$("#svgDimensions");
  dims.innerHTML="";
  const d=report.dimensions;
  dims.append(
    detailRow("Declared width",d.widthRaw||"Not declared"),
    detailRow("Declared height",d.heightRaw||"Not declared"),
    detailRow("viewBox",d.viewBoxRaw||"Not found"),
    detailRow("Path commands",fmt(report.counts.pathCommands)),
    detailRow("Non-path geometry",fmt(report.counts.nonPathGeometry)),
    detailRow("Uses / symbols",fmt(report.counts.use)+" / "+fmt(report.counts.symbol))
  );
  $("#fileName").textContent=file.name;
  renderFindings(report);
}
async function analyze(file){
  clearPreview();
  result.hidden=true;
  if(!file)return;
  if(file.size>15*1024*1024){setStatus("This SVG is over 15 MB. Use a smaller file so the browser checker stays responsive.",true);return}
  if(!/\.svg$/i.test(file.name)&&file.type!=="image/svg+xml"){setStatus("Choose an .svg file.",true);return}
  setStatus("Reading the SVG locally in your browser…");
  try{
    const text=await file.text();
    const report=analyzeSvgText(text,{fileSize:file.size});
    render(report,file);
    renderPreview(text);
    setStatus("Analysis complete. Your SVG was not uploaded anywhere.");
  }catch(e){
    setStatus(e?.message||"Quicklio could not analyze this SVG.",true);
  }
}
fileInput.addEventListener("change",()=>analyze(fileInput.files?.[0]));
for(const type of["dragenter","dragover"])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add("is-dragging")});
for(const type of["dragleave","drop"])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove("is-dragging")});
drop.addEventListener("drop",e=>{
  const file=e.dataTransfer?.files?.[0];
  if(!file)return;
  try{
    const dt=new DataTransfer();dt.items.add(file);fileInput.files=dt.files;
  }catch{}
  analyze(file);
});
$("#chooseSvg").addEventListener("click",()=>fileInput.click());
$("#clearSvg").addEventListener("click",()=>{
  fileInput.value="";result.hidden=true;clearPreview();setStatus("Choose an SVG to check it locally in your browser.");
});
