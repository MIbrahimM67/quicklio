const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

export function colorDistance(a,b){
  const dr=a[0]-b[0],dg=a[1]-b[1],db=a[2]-b[2];
  return Math.sqrt(dr*dr+dg*dg+db*db);
}

function pixelAt(data,width,x,y){
  const i=(y*width+x)*4;
  return [data[i],data[i+1],data[i+2]];
}

export function detectBackgroundColor(data,width,height){
  if(!data||!width||!height)throw new Error('Invalid image data');
  const insetX=Math.min(Math.max(0,Math.floor(width*.015)),Math.max(0,width-1));
  const insetY=Math.min(Math.max(0,Math.floor(height*.015)),Math.max(0,height-1));
  const samples=[
    pixelAt(data,width,insetX,insetY),
    pixelAt(data,width,Math.max(0,width-1-insetX),insetY),
    pixelAt(data,width,insetX,Math.max(0,height-1-insetY)),
    pixelAt(data,width,Math.max(0,width-1-insetX),Math.max(0,height-1-insetY))
  ];
  let best=samples[0],bestScore=Infinity;
  for(const sample of samples){
    const score=samples.reduce((sum,other)=>sum+colorDistance(sample,other),0);
    if(score<bestScore){best=sample;bestScore=score;}
  }
  const close=samples.filter(s=>colorDistance(s,best)<=48);
  const divisor=close.length||1;
  return close.reduce((acc,s)=>[acc[0]+s[0]/divisor,acc[1]+s[1]/divisor,acc[2]+s[2]/divisor],[0,0,0]).map(Math.round);
}

export function removeConnectedBackground({data,width,height,background,tolerance=22,softness=6}){
  if(!(data instanceof Uint8ClampedArray))throw new Error('Expected Uint8ClampedArray');
  if(data.length!==width*height*4)throw new Error('Image dimensions do not match pixel data');
  const bg=background||detectBackgroundColor(data,width,height);
  const threshold=clamp(Number(tolerance)||0,0,100)*2.35;
  const feather=clamp(Number(softness)||0,0,40)*1.35;
  const visitLimit=threshold+feather;
  const out=new Uint8ClampedArray(data);
  const count=width*height;
  const visited=new Uint8Array(count);
  const queue=new Uint32Array(count);
  let head=0,tail=0,removed=0;

  const canVisit=(p)=>{
    if(visited[p])return false;
    const i=p*4;
    if(out[i+3]===0){visited[p]=1;return false;}
    const d=colorDistance([out[i],out[i+1],out[i+2]],bg);
    return d<=visitLimit;
  };
  const enqueue=(p)=>{if(canVisit(p)){visited[p]=1;queue[tail++]=p;}};

  for(let x=0;x<width;x++){enqueue(x);if(height>1)enqueue((height-1)*width+x);}
  for(let y=1;y<height-1;y++){enqueue(y*width);if(width>1)enqueue(y*width+width-1);}

  while(head<tail){
    const p=queue[head++],i=p*4;
    const d=colorDistance([out[i],out[i+1],out[i+2]],bg);
    let alpha=0;
    if(feather>0){
      const low=Math.max(0,threshold-feather);
      const high=threshold+feather;
      alpha=Math.round(255*clamp((d-low)/Math.max(1,high-low),0,1));
    }
    if(alpha<out[i+3])out[i+3]=alpha;
    if(alpha===0)removed++;
    const x=p%width,y=Math.floor(p/width);
    if(x>0)enqueue(p-1);
    if(x+1<width)enqueue(p+1);
    if(y>0)enqueue(p-width);
    if(y+1<height)enqueue(p+width);
  }

  return {data:out,background:bg,removedPixels:removed,visitedPixels:tail};
}

export function rgbToHex(rgb){
  return '#'+rgb.map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
}

export function hexToRgb(hex){
  const clean=String(hex||'').trim().replace('#','');
  if(!/^[0-9a-f]{6}$/i.test(clean))throw new Error('Invalid hex color');
  return [parseInt(clean.slice(0,2),16),parseInt(clean.slice(2,4),16),parseInt(clean.slice(4,6),16)];
}
