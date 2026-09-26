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
function optionalNumber(value,name){
  if(value===""||value==null)return null;
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0)throw Error(name+" must be greater than zero.");
  return n;
}
function dimensionCheck(actual,mode,value,label){
  if(mode==="any")return{key:label.toLowerCase(),label,pass:true,actual,rule:"Any"};
  const target=optionalNumber(value,label+" requirement");
  if(target==null)throw Error("Enter a "+label.toLowerCase()+" requirement.");
  const pass=mode==="exact"?actual===target:mode==="min"?actual>=target:actual<=target;
  const symbol=mode==="exact"?"=":mode==="min"?"≥":"≤";
  return{key:label.toLowerCase(),label,pass,actual,rule:symbol+" "+target+" px"};
}
export function validateImageRequirements(meta,rules={}){
  const width=Number(meta?.width),height=Number(meta?.height),sizeKb=Number(meta?.sizeKb);
  if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0||!Number.isFinite(sizeKb)||sizeKb<0)throw Error("Valid image metadata is required.");
  const minKb=optionalNumber(rules.minKb,"Minimum KB"),maxKb=optionalNumber(rules.maxKb,"Maximum KB");
  if(minKb!=null&&maxKb!=null&&minKb>maxKb)throw Error("Minimum KB cannot be greater than maximum KB.");
  const checks=[];
  if(minKb!=null)checks.push({key:"min-kb",label:"Minimum file size",pass:sizeKb>=minKb,actual:sizeKb,rule:"≥ "+minKb+" KB"});
  if(maxKb!=null)checks.push({key:"max-kb",label:"Maximum file size",pass:sizeKb<=maxKb,actual:sizeKb,rule:"≤ "+maxKb+" KB"});
  checks.push(dimensionCheck(width,rules.widthMode||"any",rules.widthValue,"Width"));
  checks.push(dimensionCheck(height,rules.heightMode||"any",rules.heightValue,"Height"));
  const allowed=(rules.allowedTypes||[]).map(v=>String(v).toLowerCase()).filter(Boolean);
  const type=String(meta?.type||"").toLowerCase();
  if(allowed.length)checks.push({key:"format",label:"File format",pass:allowed.includes(type),actual:type||"unknown",rule:allowed.join(", ")});
  const failed=checks.filter(x=>!x.pass);
  return{pass:failed.length===0,checks,failed,passed:checks.length-failed.length};
}
