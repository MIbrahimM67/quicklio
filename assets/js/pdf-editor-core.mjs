export function movePage(items,from,to){
  const list=[...items];
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=list.length||to>=list.length)return list;
  const[item]=list.splice(from,1);list.splice(to,0,item);return list;
}
export function normalizeRotation(deg){const n=((Number(deg)%360)+360)%360;return n;}
export function rotatePageState(state,delta=90){return{...state,rotation:normalizeRotation((state.rotation||0)+delta)};}
export function rotatedPageSize(width,height,rotation=0){
  const r=normalizeRotation(rotation);
  return r===90||r===270?{width:height,height:width}:{width,height};
}
export function hasPageEdits(state){return Boolean((state?.annotations?.length)||normalizeRotation(state?.rotation||0)!==0);}
