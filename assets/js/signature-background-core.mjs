const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function estimatePaperColor(data,width,height){
  if(!(data instanceof Uint8ClampedArray)||data.length!==width*height*4)throw new Error('Invalid RGBA image');const samples=[[],[],[]];const step=Math.max(1,Math.floor(Math.min(width,height)/80));
  const take=(x,y)=>{const i=(y*width+x)*4;if(data[i+3]<16)return;samples[0].push(data[i]);samples[1].push(data[i+1]);samples[2].push(data[i+2])};
  for(let x=0;x<width;x+=step){take(x,0);take(x,height-1)}for(let y=0;y<height;y+=step){take(0,y);take(width-1,y)}
  return samples.map(a=>{a.sort((x,y)=>x-y);return a.length?a[(a.length/2)|0]:255});
}
export function removePaperBackground({data,width,height,background,tolerance=22,softness=12,inkColor=null}){
  const out=new Uint8ClampedArray(data),bg=background||estimatePaperColor(data,width,height);const t=clamp(Number(tolerance)||0,0,100)*2.2,s=clamp(Number(softness)||0,0,60)*1.5;let affected=0;
  for(let p=0;p<width*height;p++){const i=p*4;if(out[i+3]===0)continue;const d=Math.hypot(out[i]-bg[0],out[i+1]-bg[1],out[i+2]-bg[2]);let alpha=255;if(d<=t)alpha=0;else if(s>0&&d<t+s)alpha=Math.round(255*(d-t)/s);if(alpha<out[i+3]){out[i+3]=alpha;affected++}if(inkColor&&out[i+3]>0){const strength=out[i+3]/255;out[i]=Math.round(inkColor[0]*strength+out[i]*(1-strength));out[i+1]=Math.round(inkColor[1]*strength+out[i+1]*(1-strength));out[i+2]=Math.round(inkColor[2]*strength+out[i+2]*(1-strength));}}
  return{data:out,background:bg,affectedPixels:affected};
}
export function transparentBounds(data,width,height,alphaThreshold=8){let minX=width,minY=height,maxX=-1,maxY=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(data[(y*width+x)*4+3]<=alphaThreshold)continue;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}return maxX<minX?null:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}}
