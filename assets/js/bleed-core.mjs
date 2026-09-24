export function bleedGeometry(trimWidth,trimHeight,bleed,markMargin=18){
  for(const v of[trimWidth,trimHeight])if(!Number.isFinite(Number(v))||Number(v)<=0)throw Error("Trim size must be greater than zero.");
  bleed=Number(bleed);markMargin=Number(markMargin);
  if(!Number.isFinite(bleed)||bleed<0||!Number.isFinite(markMargin)||markMargin<0)throw Error("Bleed and mark margin cannot be negative.");
  const trimX=markMargin+bleed,trimY=markMargin+bleed,pageWidth=trimWidth+2*(markMargin+bleed),pageHeight=trimHeight+2*(markMargin+bleed);
  const m=10,gap=4;
  const marks=[
    [trimX-m-gap,trimY,trimX-gap,trimY],[trimX,trimY-m-gap,trimX,trimY-gap],
    [trimX+trimWidth+gap,trimY,trimX+trimWidth+m+gap,trimY],[trimX+trimWidth,trimY-m-gap,trimX+trimWidth,trimY-gap],
    [trimX-m-gap,trimY+trimHeight,trimX-gap,trimY+trimHeight],[trimX,trimY+trimHeight+gap,trimX,trimY+trimHeight+m+gap],
    [trimX+trimWidth+gap,trimY+trimHeight,trimX+trimWidth+m+gap,trimY+trimHeight],[trimX+trimWidth,trimY+trimHeight+gap,trimX+trimWidth,trimY+trimHeight+m+gap]
  ];
  return{trimX,trimY,trimWidth,trimHeight,pageWidth,pageHeight,bleed,markMargin,marks,artX:markMargin,artY:markMargin,artWidth:trimWidth+2*bleed,artHeight:trimHeight+2*bleed};
}
export function coverScale(srcW,srcH,dstW,dstH){const s=Math.max(dstW/srcW,dstH/srcH);return{scale:s,width:srcW*s,height:srcH*s,x:(dstW-srcW*s)/2,y:(dstH-srcH*s)/2};}
