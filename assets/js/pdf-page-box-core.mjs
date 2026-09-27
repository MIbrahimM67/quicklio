export const BOX_NAMES=["MediaBox","CropBox","BleedBox","TrimBox","ArtBox"];
export const PT_PER_IN=72;
export const MM_PER_IN=25.4;

export function toPoints(value,unit="pt"){
  const n=Number(value);
  if(!Number.isFinite(n))throw Error("Enter a valid number.");
  if(unit==="mm")return n*PT_PER_IN/MM_PER_IN;
  if(unit==="in")return n*PT_PER_IN;
  if(unit==="pt")return n;
  throw Error("Unsupported unit.");
}

export function fromPoints(value,unit="pt"){
  const n=Number(value);
  if(!Number.isFinite(n))throw Error("Invalid point value.");
  if(unit==="mm")return n*MM_PER_IN/PT_PER_IN;
  if(unit==="in")return n/PT_PER_IN;
  if(unit==="pt")return n;
  throw Error("Unsupported unit.");
}

export function normalizeBox(box){
  const x=Number(box?.x??box?.left),y=Number(box?.y??box?.bottom);
  const width=Number(box?.width??(Number(box?.right)-x));
  const height=Number(box?.height??(Number(box?.top)-y));
  if([x,y,width,height].some(v=>!Number.isFinite(v))||width<=0||height<=0)throw Error("Box coordinates must describe a positive rectangle.");
  return{left:x,bottom:y,right:x+width,top:y+height,width,height};
}

export function boxFromEdges({left,bottom,right,top}){
  left=Number(left);bottom=Number(bottom);right=Number(right);top=Number(top);
  if([left,bottom,right,top].some(v=>!Number.isFinite(v)))throw Error("Box coordinates must be numbers.");
  if(right<=left||top<=bottom)throw Error("Right must be greater than left and top must be greater than bottom.");
  return{left,bottom,right,top,width:right-left,height:top-bottom};
}

export function toPdfBox(box){
  const b=normalizeBox(box);
  return{x:b.left,y:b.bottom,width:b.width,height:b.height};
}

export function containsBox(outer,inner,epsilon=.01){
  const a=normalizeBox(outer),b=normalizeBox(inner);
  return b.left>=a.left-epsilon&&b.bottom>=a.bottom-epsilon&&b.right<=a.right+epsilon&&b.top<=a.top+epsilon;
}

export function insetBox(box,amount){
  const b=normalizeBox(box),n=Number(amount);
  if(!Number.isFinite(n)||n<0)throw Error("Inset must be zero or greater.");
  return boxFromEdges({left:b.left+n,bottom:b.bottom+n,right:b.right-n,top:b.top-n});
}

export function expandBox(box,amount){
  const b=normalizeBox(box),n=Number(amount);
  if(!Number.isFinite(n)||n<0)throw Error("Bleed must be zero or greater.");
  return boxFromEdges({left:b.left-n,bottom:b.bottom-n,right:b.right+n,top:b.top+n});
}

export function boxesAlmostEqual(a,b,epsilon=.05){
  const x=normalizeBox(a),y=normalizeBox(b);
  return Math.abs(x.left-y.left)<=epsilon&&Math.abs(x.bottom-y.bottom)<=epsilon&&Math.abs(x.right-y.right)<=epsilon&&Math.abs(x.top-y.top)<=epsilon;
}

export function validateBoxes(boxes){
  const issues=[];
  let media;
  try{media=normalizeBox(boxes.MediaBox);}catch(e){issues.push("MediaBox: "+e.message);return issues;}
  for(const name of BOX_NAMES.slice(1)){
    if(!boxes[name])continue;
    try{
      const b=normalizeBox(boxes[name]);
      if(!containsBox(media,b))issues.push(`${name} extends outside MediaBox.`);
    }catch(e){issues.push(`${name}: ${e.message}`);}
  }
  if(boxes.BleedBox&&boxes.TrimBox){
    try{if(!containsBox(boxes.BleedBox,boxes.TrimBox))issues.push("TrimBox is not fully inside BleedBox.");}catch{}
  }
  return issues;
}
