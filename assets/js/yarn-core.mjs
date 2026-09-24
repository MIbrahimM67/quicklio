export function calculateYarnFromSwatch({projectWidth,projectHeight,swatchWidth,swatchHeight,swatchYarn,bufferPercent=10,ballLength,unit="yd"}){
  const vals=[projectWidth,projectHeight,swatchWidth,swatchHeight,swatchYarn,ballLength].map(Number);
  if(vals.some(v=>!Number.isFinite(v)||v<=0))throw Error("All measurements and yarn amounts must be greater than zero.");
  const [pw,ph,sw,sh,sy,bl]=vals;
  const buffer=Number(bufferPercent);if(!Number.isFinite(buffer)||buffer<0||buffer>100)throw Error("Buffer must be between 0% and 100%.");
  const areaRatio=(pw*ph)/(sw*sh);
  const baseYarn=sy*areaRatio,totalYarn=baseYarn*(1+buffer/100),balls=Math.ceil(totalYarn/bl);
  return{baseYarn,totalYarn,balls,purchasedYarn:balls*bl,spareYarn:balls*bl-baseYarn,unit};
}
