export function parsePageRange(input,total){
  total=Number(total);if(!Number.isInteger(total)||total<1)throw Error("Total pages must be a positive integer.");
  const text=String(input??"").trim();if(!text)return Array.from({length:total},(_,i)=>i);
  const set=new Set();
  for(const raw of text.split(",")){
    const part=raw.trim();if(!part)continue;
    if(part.includes("-")){const[a,b]=part.split("-").map(Number);if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a>total||b>total)throw Error("Page range is outside the document.");const lo=Math.min(a,b),hi=Math.max(a,b);for(let n=lo;n<=hi;n++)set.add(n-1);}
    else{const n=Number(part);if(!Number.isInteger(n)||n<1||n>total)throw Error("Page number is outside the document.");set.add(n-1);}
  }
  return[...set].sort((a,b)=>a-b);
}
export function pageNumberPosition(width,height,position="bottom-center",margin=24){
  const m=Number(margin);const map={
    "top-left":{x:m,y:height-m,align:"left"},
    "top-center":{x:width/2,y:height-m,align:"center"},
    "top-right":{x:width-m,y:height-m,align:"right"},
    "bottom-left":{x:m,y:m,align:"left"},
    "bottom-center":{x:width/2,y:m,align:"center"},
    "bottom-right":{x:width-m,y:m,align:"right"}
  };return map[position]||map["bottom-center"];
}
export function cropBox(width,height,{left=0,right=0,top=0,bottom=0}={}){
  left=Number(left);right=Number(right);top=Number(top);bottom=Number(bottom);
  if([left,right,top,bottom].some(v=>!Number.isFinite(v)||v<0))throw Error("Crop margins cannot be negative.");
  const w=width-left-right,h=height-top-bottom;if(w<=0||h<=0)throw Error("Crop margins remove the entire page.");
  return{left,bottom,right:left+w,top:bottom+h,width:w,height:h};
}
export function hexToRgb(hex){const s=String(hex).replace("#","");if(!/^[0-9a-fA-F]{6}$/.test(s))throw Error("Invalid color.");return{r:parseInt(s.slice(0,2),16)/255,g:parseInt(s.slice(2,4),16)/255,b:parseInt(s.slice(4,6),16)/255};}
