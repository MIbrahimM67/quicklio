function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function fitLine(points){
  if(points.length<8)return null;
  let sx=0,sy=0,sxx=0,sxy=0;
  for(const [x,y] of points){sx+=x;sy+=y;sxx+=x*x;sxy+=x*y}
  const n=points.length,den=n*sxx-sx*sx;if(Math.abs(den)<1e-6)return null;
  const slope=(n*sxy-sx*sy)/den,intercept=(sy-slope*sx)/n;
  let ssTot=0,ssRes=0,mean=sy/n;
  for(const [x,y] of points){const p=slope*x+intercept;ssTot+=(y-mean)**2;ssRes+=(y-p)**2}
  return{slope,intercept,r2:ssTot?1-ssRes/ssTot:0};
}
function otsu(hist,total){
  let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];
  let sumB=0,wB=0,best=0,threshold=160;
  for(let t=0;t<256;t++){
    wB+=hist[t];if(!wB)continue;const wF=total-wB;if(!wF)break;
    sumB+=t*hist[t];const mB=sumB/wB,mF=(sum-sumB)/wF,between=wB*wF*(mB-mF)**2;
    if(between>best){best=between;threshold=t}
  }
  return threshold;
}
export function detectDocumentFromRgba(rgba,width,height,{paddingRatio=.018}={}){
  width=Math.trunc(width);height=Math.trunc(height);
  if(!rgba||width<16||height<16||rgba.length<width*height*4)return null;
  const n=width*height,luma=new Uint8Array(n),hist=new Uint32Array(256);
  let li=0;
  for(let i=0;i<n;i++){const r=rgba[i*4],g=rgba[i*4+1],b=rgba[i*4+2],v=Math.round(.2126*r+.7152*g+.0722*b);luma[li++]=v;hist[v]++}
  const threshold=clamp(otsu(hist,n),95,225);
  const light=new Uint8Array(n);
  for(let i=0;i<n;i++)light[i]=luma[i]>=threshold?1:0;
  const seen=new Uint8Array(n),queue=new Int32Array(n);
  let best=null;
  for(let start=0;start<n;start++){
    if(!light[start]||seen[start])continue;
    let q0=0,q1=0;queue[q1++]=start;seen[start]=1;
    let area=0,minX=width,minY=height,maxX=-1,maxY=-1,sumLum=0;
    while(q0<q1){
      const idx=queue[q0++],y=Math.floor(idx/width),x=idx-y*width;area++;sumLum+=luma[idx];
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
      let ni;if(x>0){ni=idx-1;if(light[ni]&&!seen[ni]){seen[ni]=1;queue[q1++]=ni}}
      if(x+1<width){ni=idx+1;if(light[ni]&&!seen[ni]){seen[ni]=1;queue[q1++]=ni}}
      if(y>0){ni=idx-width;if(light[ni]&&!seen[ni]){seen[ni]=1;queue[q1++]=ni}}
      if(y+1<height){ni=idx+width;if(light[ni]&&!seen[ni]){seen[ni]=1;queue[q1++]=ni}}
    }
    if(!best||area>best.area)best={area,minX,minY,maxX,maxY,sumLum};
  }
  if(!best)return null;
  const bw=best.maxX-best.minX+1,bh=best.maxY-best.minY+1,boxArea=bw*bh,areaFrac=best.area/n,boxFrac=boxArea/n,fill=best.area/boxArea,aspect=bw/bh;
  if(areaFrac<.25||boxFrac<.32||fill<.58||aspect<.38||aspect>2.65)return null;
  let outsideSum=0,outsideCount=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(x<best.minX||x>best.maxX||y<best.minY||y>best.maxY){outsideSum+=luma[y*width+x];outsideCount++}
  }
  if(outsideCount<n*.012)return null;
  const insideMean=best.sumLum/best.area,outsideMean=outsideSum/outsideCount,contrast=insideMean-outsideMean;
  if(contrast<14)return null;
  const raw={x:best.minX,y:best.minY,width:bw,height:bh};
  const removed=1-boxFrac;
  if(removed<.012)return null;

  // Estimate mild camera tilt from left/right page edges. Only return an angle
  // when both sides agree closely enough to avoid "straightening" perspective distortion.
  const component=new Uint8Array(n);
  // Re-run a flood from a seed inside the winning box to mark the same bright component.
  // Choose the brightest connected seed nearest the box center.
  let seed=-1,bestDist=Infinity,cx=(best.minX+best.maxX)/2,cy=(best.minY+best.maxY)/2;
  for(let y=best.minY;y<=best.maxY;y++)for(let x=best.minX;x<=best.maxX;x++){
    const idx=y*width+x;if(!light[idx])continue;const d=(x-cx)**2+(y-cy)**2;if(d<bestDist){bestDist=d;seed=idx}
  }
  if(seed>=0){
    let q0=0,q1=0;queue[q1++]=seed;component[seed]=1;
    while(q0<q1){
      const idx=queue[q0++],y=Math.floor(idx/width),x=idx-y*width;let ni;
      if(x>0){ni=idx-1;if(light[ni]&&!component[ni]){component[ni]=1;queue[q1++]=ni}}
      if(x+1<width){ni=idx+1;if(light[ni]&&!component[ni]){component[ni]=1;queue[q1++]=ni}}
      if(y>0){ni=idx-width;if(light[ni]&&!component[ni]){component[ni]=1;queue[q1++]=ni}}
      if(y+1<height){ni=idx+width;if(light[ni]&&!component[ni]){component[ni]=1;queue[q1++]=ni}}
    }
  }
  const left=[],right=[];
  const step=Math.max(1,Math.floor(bh/90));
  for(let y=best.minY;y<=best.maxY;y+=step){
    let lx=-1,rx=-1;
    for(let x=best.minX;x<=best.maxX;x++){if(component[y*width+x]){lx=x;break}}
    for(let x=best.maxX;x>=best.minX;x--){if(component[y*width+x]){rx=x;break}}
    if(lx>=0&&rx-lx>bw*.55){left.push([y,lx]);right.push([y,rx])}
  }
  const lf=fitLine(left),rf=fitLine(right);let angle=0,angleConfidence=false;
  if(lf&&rf&&lf.r2>.45&&rf.r2>.45&&Math.abs(lf.slope-rf.slope)<.045){
    const candidate=Math.atan((lf.slope+rf.slope)/2)*180/Math.PI;
    if(Math.abs(candidate)>=.35&&Math.abs(candidate)<=4.5){angle=candidate;angleConfidence=true}
  }

  const pad=Math.max(1,Math.round(Math.max(width,height)*clamp(Number(paddingRatio)||0,0,.08)));
  const x=clamp(raw.x-pad,0,width-1),y=clamp(raw.y-pad,0,height-1);
  const x2=clamp(raw.x+raw.width-1+pad,0,width-1),y2=clamp(raw.y+raw.height-1+pad,0,height-1);
  const confidence=clamp(.35+(contrast-14)/90+Math.min(.2,fill-.58)+Math.min(.18,removed),0,1);
  return{x,y,width:x2-x+1,height:y2-y+1,raw,confidence,angle,angleConfidence,contrast,threshold,removedFraction:removed};
}
