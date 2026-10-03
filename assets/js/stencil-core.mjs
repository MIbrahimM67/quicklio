export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const luminance=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;

export function thresholdMaskFromRgba(data,width,height,{threshold=140,invert=false,alphaCutoff=8}={}){
  if(!(data instanceof Uint8ClampedArray))throw new TypeError('Expected RGBA Uint8ClampedArray');
  if(width<1||height<1||data.length!==width*height*4)throw new Error('Image dimensions do not match RGBA data');
  const out=new Uint8Array(width*height); const t=clamp(Number(threshold)||0,0,255);
  for(let p=0;p<out.length;p++){
    const i=p*4;if(data[i+3]<=alphaCutoff){out[p]=0;continue;}
    const dark=luminance(data[i],data[i+1],data[i+2])<t;
    out[p]=(invert?!dark:dark)?1:0;
  }
  return out;
}

export function removeSmallComponents(mask,width,height,minArea=0,value=1){
  minArea=Math.max(0,Math.floor(Number(minArea)||0)); if(!minArea)return mask.slice();
  const out=mask.slice(),seen=new Uint8Array(mask.length),dirs=[1,0,-1,0,1];
  for(let start=0;start<mask.length;start++){
    if(seen[start]||mask[start]!==value)continue;
    const stack=[start],pixels=[];seen[start]=1;
    while(stack.length){const idx=stack.pop();pixels.push(idx);const x=idx%width,y=(idx/width)|0;
      for(let d=0;d<4;d++){const nx=x+dirs[d],ny=y+dirs[d+1];if(nx<0||ny<0||nx>=width||ny>=height)continue;const ni=ny*width+nx;if(!seen[ni]&&mask[ni]===value){seen[ni]=1;stack.push(ni);}}
    }
    if(pixels.length<minArea)for(const idx of pixels)out[idx]=value?0:1;
  }
  return out;
}

function exteriorZeroMask(mask,width,height){
  const ext=new Uint8Array(mask.length),queue=[];
  const push=(idx)=>{if(idx>=0&&idx<mask.length&&!ext[idx]&&mask[idx]===0){ext[idx]=1;queue.push(idx)}};
  for(let x=0;x<width;x++){push(x);push((height-1)*width+x)}
  for(let y=0;y<height;y++){push(y*width);push(y*width+width-1)}
  const dirs=[1,0,-1,0,1];
  for(let q=0;q<queue.length;q++){const idx=queue[q],x=idx%width,y=(idx/width)|0;for(let d=0;d<4;d++){const nx=x+dirs[d],ny=y+dirs[d+1];if(nx<0||ny<0||nx>=width||ny>=height)continue;push(ny*width+nx)}}
  return ext;
}

export function findEnclosedHoles(mask,width,height,{minArea=1,maxHoles=100}={}){
  const ext=exteriorZeroMask(mask,width,height),seen=ext.slice(),holes=[],dirs=[1,0,-1,0,1];
  for(let start=0;start<mask.length&&holes.length<maxHoles;start++){
    if(seen[start]||mask[start]!==0)continue;
    const stack=[start],pixels=[];seen[start]=1;let minX=width,minY=height,maxX=0,maxY=0,sumX=0,sumY=0;
    while(stack.length){const idx=stack.pop(),x=idx%width,y=(idx/width)|0;pixels.push(idx);sumX+=x;sumY+=y;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(let d=0;d<4;d++){const nx=x+dirs[d],ny=y+dirs[d+1];if(nx<0||ny<0||nx>=width||ny>=height)continue;const ni=ny*width+nx;if(!seen[ni]&&mask[ni]===0){seen[ni]=1;stack.push(ni)}}
    }
    if(pixels.length>=minArea)holes.push({pixels,size:pixels.length,bbox:{minX,minY,maxX,maxY},centroid:{x:sumX/pixels.length,y:sumY/pixels.length}});
  }
  return holes;
}

function carveLine(mask,width,height,x1,y1,x2,y2,thickness){
  const radius=Math.max(0,Math.floor((thickness-1)/2));
  const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1),steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));
  for(let s=0;s<=steps;s++){const x=x1+dx*s,y=y1+dy*s;for(let yy=-radius;yy<=radius;yy++)for(let xx=-radius;xx<=radius;xx++){const nx=x+xx,ny=y+yy;if(nx>=0&&ny>=0&&nx<width&&ny<height)mask[ny*width+nx]=0;}}
}

export function addBridges(mask,width,height,{bridgeWidth=3,minHoleArea=4,maxHoles=40}={}){
  const out=mask.slice(),ext=exteriorZeroMask(out,width,height),holes=findEnclosedHoles(out,width,height,{minArea:minHoleArea,maxHoles}),dirs=[[1,0],[-1,0],[0,1],[0,-1]];let bridged=0;
  for(const hole of holes){
    let best=null;const stride=Math.max(1,Math.floor(hole.pixels.length/80));
    for(let pi=0;pi<hole.pixels.length;pi+=stride){const idx=hole.pixels[pi],sx=idx%width,sy=(idx/width)|0;
      for(const[dx,dy]of dirs){let x=sx,y=sy,dist=0;while(true){x+=dx;y+=dy;dist++;if(x<0||y<0||x>=width||y>=height)break;const ni=y*width+x;if(ext[ni]){if(!best||dist<best.dist)best={sx,sy,x,y,dist};break;}if(dist>Math.max(width,height))break;}}
    }
    if(best){carveLine(out,width,height,best.sx,best.sy,best.x,best.y,Math.max(1,Math.round(bridgeWidth)));bridged++;}
  }
  return{mask:out,bridged,holesDetected:holes.length};
}

export function maskToRgba(mask,{cut=[0,0,0],material=[255,255,255],transparentMaterial=false}={}){
  const out=new Uint8ClampedArray(mask.length*4);
  for(let p=0;p<mask.length;p++){const i=p*4,c=mask[p]?cut:material;out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];out[i+3]=mask[p]?255:(transparentMaterial?0:255)}
  return out;
}

const pointKey=(x,y)=>x+','+y;
function dirIndex(a,b){const dx=b[0]-a[0],dy=b[1]-a[1];if(dx>0)return 0;if(dy>0)return 1;if(dx<0)return 2;return 3;}
function simplifyLoop(points){
  if(points.length<4)return points;const out=[];
  for(let i=0;i<points.length;i++){const a=points[(i-1+points.length)%points.length],b=points[i],c=points[(i+1)%points.length];if((a[0]===b[0]&&b[0]===c[0])||(a[1]===b[1]&&b[1]===c[1]))continue;out.push(b)}
  return out;
}

export function traceMaskToPath(mask,width,height){
  const edges=[],at=new Map();
  const add=(x1,y1,x2,y2)=>{const e={a:[x1,y1],b:[x2,y2],used:false};edges.push(e);const k=pointKey(x1,y1);if(!at.has(k))at.set(k,[]);at.get(k).push(e)};
  const filled=(x,y)=>x>=0&&y>=0&&x<width&&y<height&&mask[y*width+x]===1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(filled(x,y)){
    if(!filled(x,y-1))add(x,y,x+1,y);
    if(!filled(x+1,y))add(x+1,y,x+1,y+1);
    if(!filled(x,y+1))add(x+1,y+1,x,y+1);
    if(!filled(x-1,y))add(x,y+1,x,y);
  }
  const loops=[];
  for(const first of edges){if(first.used)continue;first.used=true;const start=first.a;let prev=first.a,cur=first.b;const pts=[start,cur];let guard=0;
    while(pointKey(cur[0],cur[1])!==pointKey(start[0],start[1])&&guard++<edges.length+4){
      const candidates=(at.get(pointKey(cur[0],cur[1]))||[]).filter(e=>!e.used);if(!candidates.length)break;
      const inDir=dirIndex(prev,cur);candidates.sort((e1,e2)=>{const t1=(dirIndex(cur,e1.b)-inDir+4)%4,t2=(dirIndex(cur,e2.b)-inDir+4)%4;const rank=t=>t===1?0:t===0?1:t===3?2:3;return rank(t1)-rank(t2)});
      const next=candidates[0];next.used=true;prev=cur;cur=next.b;pts.push(cur);
    }
    if(pts.length>=4&&pointKey(cur[0],cur[1])===pointKey(start[0],start[1])){pts.pop();const simple=simplifyLoop(pts);if(simple.length>=3)loops.push(simple)}
  }
  return loops.map(loop=>'M'+loop.map((p,i)=>(i?'L':'')+p[0]+' '+p[1]).join('')+'Z').join('');
}

export function buildStencilSvg(mask,width,height,{physicalWidth=null,unit='in',title='Stencil'}={}){
  const path=traceMaskToPath(mask,width,height);const ratio=height/width;const size=physicalWidth?` width="${Number(physicalWidth).toFixed(3)}${unit}" height="${(Number(physicalWidth)*ratio).toFixed(3)}${unit}"`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"${size} role="img" aria-label="${String(title).replace(/[&<>\"]/g,'')}"><path d="${path}" fill="#000" fill-rule="evenodd"/></svg>`;
}
