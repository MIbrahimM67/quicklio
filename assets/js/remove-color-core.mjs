const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

export function colorDistance(a,b){
  const dr=(a?.[0]??0)-(b?.[0]??0),dg=(a?.[1]??0)-(b?.[1]??0),db=(a?.[2]??0)-(b?.[2]??0);
  return Math.sqrt(dr*dr+dg*dg+db*db);
}

export function rgbToHex(rgb){
  return '#'+[0,1,2].map(i=>clamp(Math.round(rgb?.[i]??0),0,255).toString(16).padStart(2,'0')).join('');
}

export function hexToRgb(hex){
  const clean=String(hex||'').trim().replace('#','');
  if(!/^[0-9a-f]{6}$/i.test(clean))throw new Error('Invalid hex color');
  return [parseInt(clean.slice(0,2),16),parseInt(clean.slice(2,4),16),parseInt(clean.slice(4,6),16)];
}

export function removeSelectedColor({data,width,height,target,tolerance=18,softness=4}){
  if(!(data instanceof Uint8ClampedArray))throw new Error('Expected Uint8ClampedArray');
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||data.length!==width*height*4)throw new Error('Image dimensions do not match pixel data');
  if(!Array.isArray(target)||target.length<3)throw new Error('Choose a color to remove');

  const out=new Uint8ClampedArray(data);
  const threshold=clamp(Number(tolerance)||0,0,100)*2.35;
  const feather=clamp(Number(softness)||0,0,40)*1.35;
  const low=Math.max(0,threshold-feather),high=threshold+feather;
  let fullyTransparent=0,affected=0;

  for(let p=0;p<width*height;p++){
    const i=p*4,sourceAlpha=out[i+3];
    if(sourceAlpha===0)continue;
    const d=colorDistance([out[i],out[i+1],out[i+2]],target);
    let keep=1;
    if(feather===0)keep=d<=threshold?0:1;
    else if(d<=low)keep=0;
    else if(d<high)keep=(d-low)/Math.max(1,high-low);
    if(keep>=1)continue;
    affected++;
    out[i+3]=Math.round(sourceAlpha*clamp(keep,0,1));
    if(out[i+3]===0)fullyTransparent++;
  }

  return{data:out,affectedPixels:affected,fullyTransparentPixels:fullyTransparent,totalPixels:width*height};
}
