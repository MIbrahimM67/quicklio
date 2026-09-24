export function normalizeSignatureSize(size){
  const n=Number(size);
  if(!Number.isInteger(n)||n<4||n>64||n%4!==0)throw Error("Pages per signature must be a multiple of 4 between 4 and 64.");
  return n;
}
export function signaturePlans(totalPages,signatureSize=16){
  totalPages=Number(totalPages);signatureSize=normalizeSignatureSize(signatureSize);
  if(!Number.isInteger(totalPages)||totalPages<1)throw Error("PDF must contain at least one page.");
  const plans=[];
  let start=1;
  while(start<=totalPages){
    const actual=Math.min(signatureSize,totalPages-start+1);
    const padded=Math.ceil(actual/4)*4;
    const end=start+padded-1;
    const sheets=[];
    for(let i=0;i<padded/4;i++){
      const a=start+2*i,b=start+2*i+1,c=end-2*i-1,d=end-2*i;
      sheets.push({front:[d<=totalPages?d:null,a<=totalPages?a:null],back:[b<=totalPages?b:null,c<=totalPages?c:null]});
    }
    plans.push({start,endActual:Math.min(totalPages,start+actual-1),paddedPages:padded,sheets});
    start+=actual;
  }
  return plans;
}
export function paperPoints(kind){
  if(kind==="a4")return{width:841.8898,height:595.2756,label:"A4 landscape"};
  return{width:792,height:612,label:"Letter landscape"};
}
