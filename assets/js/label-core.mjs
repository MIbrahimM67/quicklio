import{inToPt,mmToPt,PAPER}from"./print-layout-core.mjs";
export const LABEL_PRESETS={
  avery5160:{label:"Avery 5160 · 30-up",paper:"letter",cols:3,rows:10,labelW:inToPt(2.625),labelH:inToPt(1),marginX:inToPt(.1875),marginY:inToPt(.5),gapX:inToPt(.125),gapY:0},
  avery5163:{label:"Avery 5163 · 10-up",paper:"letter",cols:2,rows:5,labelW:inToPt(4),labelH:inToPt(2),marginX:inToPt(.15625),marginY:inToPt(.5),gapX:inToPt(.1875),gapY:0},
  a4_21:{label:"A4 · 21 labels",paper:"a4",cols:3,rows:7,labelW:mmToPt(63.5),labelH:mmToPt(38.1),marginX:mmToPt(7.25),marginY:mmToPt(15.15),gapX:mmToPt(2.5),gapY:0,
  thermal4x6:{label:"Thermal · 4 × 6 in",paper:"photo4x6",cols:1,rows:1,labelW:inToPt(4),labelH:inToPt(6),marginX:0,marginY:0,gapX:0,gapY:0}
};
export function parseCSV(text){
  const rows=[];let row=[],field="",quoted=false;
  const s=String(text??"");
  for(let i=0;i<=s.length;i++){
    const ch=s[i]??"\n";
    if(quoted){
      if(ch==='"'&&s[i+1]==='"'){field+='"';i++;}
      else if(ch==='"')quoted=false;else field+=ch;
    }else if(ch==='"')quoted=true;
    else if(ch===','){row.push(field);field="";}
    else if(ch==='\n'||ch==='\r'||i===s.length){if(ch==='\r'&&s[i+1]==='\n')i++;row.push(field);field="";if(row.some(v=>v.trim()!==""))rows.push(row);row=[];}
    else field+=ch;
  }
  if(rows.length<2)return{headers:rows[0]?.map(x=>x.trim())||[],records:[]};
  const headers=rows[0].map((h,i)=>h.trim()||("Column "+(i+1)));
  return{headers,records:rows.slice(1).map(cols=>Object.fromEntries(headers.map((h,i)=>[h,cols[i]??""])))};
}
export function labelPlan(key="avery5160"){
  const p=LABEL_PRESETS[key];if(!p)throw Error("Unknown label preset.");
  const paper=PAPER[p.paper],positions=[];
  for(let r=0;r<p.rows;r++)for(let c=0;c<p.cols;c++)positions.push({x:p.marginX+c*(p.labelW+p.gapX),y:p.marginY+r*(p.labelH+p.gapY),width:p.labelW,height:p.labelH,row:r,col:c});
  return{...p,pageWidth:paper.width,pageHeight:paper.height,positions,perPage:positions.length};
}
export function normalizeBarcodeType(type){const map={code128:"code128",ean13:"ean13",upca:"upca",qr:"qrcode"};if(!map[type])throw Error("Unsupported barcode type.");return map[type];}
