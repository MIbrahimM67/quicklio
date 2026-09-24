export const SHIPPING_PAGE={portrait:{width:288,height:432},landscape:{width:432,height:288}};
export function cropRegion(pageWidth,pageHeight,preset="full",custom={left:0,top:0,right:0,bottom:0}){
  pageWidth=Number(pageWidth);pageHeight=Number(pageHeight);if(pageWidth<=0||pageHeight<=0)throw Error("Invalid PDF page size.");
  const halves={full:[0,0,1,1],top:[0,0,1,.5],bottom:[0,.5,1,1],left:[0,0,.5,1],right:[.5,0,1,1]};
  let n=halves[preset];
  if(preset==="custom"){const l=Number(custom.left)/100,t=Number(custom.top)/100,r=1-Number(custom.right)/100,b=1-Number(custom.bottom)/100;n=[l,t,r,b];}
  if(!n||n.some(v=>!Number.isFinite(v))||n[0]<0||n[1]<0||n[2]>1||n[3]>1||n[0]>=n[2]||n[1]>=n[3])throw Error("Invalid crop region.");
  const[l,t,r,b]=n;
  return{left:l*pageWidth,right:r*pageWidth,top:(1-t)*pageHeight,bottom:(1-b)*pageHeight,width:(r-l)*pageWidth,height:(b-t)*pageHeight};
}
export function fitShipping(sourceW,sourceH,orientation="portrait",margin=0){
  const page=SHIPPING_PAGE[orientation]||SHIPPING_PAGE.portrait,availW=page.width-2*margin,availH=page.height-2*margin,scale=Math.min(availW/sourceW,availH/sourceH),width=sourceW*scale,height=sourceH*scale;
  return{pageWidth:page.width,pageHeight:page.height,x:(page.width-width)/2,y:(page.height-height)/2,width,height,scale};
}
