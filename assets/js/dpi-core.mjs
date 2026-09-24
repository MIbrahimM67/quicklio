export function calculateDpi(pxWidth,pxHeight,printWidth,printHeight){
  const vals=[pxWidth,pxHeight,printWidth,printHeight].map(Number);if(vals.some(v=>!Number.isFinite(v)||v<=0))throw Error("Pixels and print dimensions must be greater than zero.");
  return{dpiX:vals[0]/vals[2],dpiY:vals[1]/vals[3],effectiveDpi:Math.min(vals[0]/vals[2],vals[1]/vals[3])};
}
export function maxPrintSize(pxWidth,pxHeight,targetDpi){
  const vals=[pxWidth,pxHeight,targetDpi].map(Number);if(vals.some(v=>!Number.isFinite(v)||v<=0))throw Error("Pixels and DPI must be greater than zero.");
  return{widthIn:vals[0]/vals[2],heightIn:vals[1]/vals[2],widthCm:vals[0]/vals[2]*2.54,heightCm:vals[1]/vals[2]*2.54};
}
export function dpiLabel(dpi){dpi=Number(dpi);if(dpi>=300)return"High-quality photo";if(dpi>=240)return"Very good";if(dpi>=150)return"Good for posters / distance";if(dpi>=100)return"Usable at distance";return"Low resolution";}
