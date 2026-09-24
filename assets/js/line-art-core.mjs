export function grayscale(data){
  const out=new Uint8ClampedArray(data.length/4);
  for(let i=0,j=0;i<data.length;i+=4,j++)out[j]=Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);
  return out;
}
export function sobel(gray,width,height){
  const out=new Uint8ClampedArray(width*height);
  const gx=[-1,0,1,-2,0,2,-1,0,1],gy=[-1,-2,-1,0,0,0,1,2,1];
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    let sx=0,sy=0,k=0;
    for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++,k++){const v=gray[(y+yy)*width+x+xx];sx+=v*gx[k];sy+=v*gy[k];}
    out[y*width+x]=Math.min(255,Math.round(Math.hypot(sx,sy)));
  }
  return out;
}
export function thresholdEdges(edges,threshold=80,invert=false){
  const t=Number(threshold);const out=new Uint8ClampedArray(edges.length);
  for(let i=0;i<edges.length;i++){let v=edges[i]>=t?0:255;if(invert)v=255-v;out[i]=v;}
  return out;
}
export function thickenBinary(binary,width,height,radius=0){
  radius=Math.max(0,Math.round(Number(radius)||0));if(!radius)return binary.slice();
  const out=binary.slice();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(binary[y*width+x]===0){
    for(let yy=-radius;yy<=radius;yy++)for(let xx=-radius;xx<=radius;xx++){const nx=x+xx,ny=y+yy;if(nx>=0&&ny>=0&&nx<width&&ny<height)out[ny*width+nx]=0;}
  }
  return out;
}
export function rgbaFromBinary(binary){
  const out=new Uint8ClampedArray(binary.length*4);
  for(let i=0;i<binary.length;i++){const v=binary[i],j=i*4;out[j]=v;out[j+1]=v;out[j+2]=v;out[j+3]=255;}
  return out;
}
