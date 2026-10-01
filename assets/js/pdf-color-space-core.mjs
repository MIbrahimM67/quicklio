const SPACE_KEYS=['DeviceRGB','DeviceCMYK','DeviceGray','CalRGB','CalGray','Lab','ICCBased','Indexed','Separation','DeviceN'];

function asText(input){
  if(typeof input==='string')return input;
  if(input instanceof Uint8Array)return new TextDecoder('latin1').decode(input);
  if(input instanceof ArrayBuffer)return new TextDecoder('latin1').decode(new Uint8Array(input));
  throw new TypeError('Expected PDF bytes or a string.');
}

function countToken(text,name){
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return (text.match(new RegExp(`/${escaped}(?=[\\s<>\\[\\]()/]|$)`,'g'))||[]).length;
}

function decodePdfName(name=''){
  return name.replace(/#([0-9A-Fa-f]{2})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
}

function unique(values){return [...new Set(values.filter(Boolean))];}

function extractSpotNames(text){
  const spots=[];
  const sep=/\/Separation\s+\/([^\s<>\[\]()%/]+)/g;
  let m;
  while((m=sep.exec(text)))spots.push(decodePdfName(m[1]));

  const devn=/\/DeviceN\s*\[([^\]]{0,4096})\]/g;
  while((m=devn.exec(text))){
    const names=m[1].match(/\/([^\s<>\[\]()%/]+)/g)||[];
    for(const token of names)spots.push(decodePdfName(token.slice(1)));
  }
  return unique(spots).filter(name=>!['DeviceRGB','DeviceCMYK','DeviceGray'].includes(name));
}

function extractLiteralAfterKey(text,key){
  const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(`/${escaped}\\s*\\(([^)]{1,240})\\)`);
  const m=text.match(re);
  return m?m[1].replace(/\\([()\\])/g,'$1').trim():'';
}

export function scanPdfColorSpaces(input){
  const text=asText(input);
  const counts=Object.fromEntries(SPACE_KEYS.map(name=>[name,countToken(text,name)]));
  const spots=extractSpotNames(text);
  const hasOutputIntent=/\/OutputIntents?\b/.test(text)||/\/OutputIntent\b/.test(text);
  const pdfxVersion=extractLiteralAfterKey(text,'GTS_PDFXVersion');
  const pdfxConformance=extractLiteralAfterKey(text,'GTS_PDFXConformance');
  return {
    counts,
    spots,
    hasOutputIntent,
    pdfxVersion,
    pdfxConformance,
    declared:{
      rgb:counts.DeviceRGB>0||counts.CalRGB>0,
      cmyk:counts.DeviceCMYK>0,
      gray:counts.DeviceGray>0||counts.CalGray>0,
      icc:counts.ICCBased>0,
      lab:counts.Lab>0,
      indexed:counts.Indexed>0,
      spot:counts.Separation>0||counts.DeviceN>0||spots.length>0
    }
  };
}

export function summarizePageOperatorNames(names=[]){
  const result={rgb:0,cmyk:0,gray:0,colorSpaceOps:0};
  for(const name of names){
    if(name==='setFillRGBColor'||name==='setStrokeRGBColor')result.rgb++;
    else if(name==='setFillCMYKColor'||name==='setStrokeCMYKColor')result.cmyk++;
    else if(name==='setFillGray'||name==='setStrokeGray')result.gray++;
    else if(name==='setFillColorSpace'||name==='setStrokeColorSpace')result.colorSpaceOps++;
  }
  return result;
}

export function classifyColorFindings({declared={},pages=[]}={}){
  const pageRgb=pages.some(p=>Number(p.rgb)>0);
  const pageCmyk=pages.some(p=>Number(p.cmyk)>0);
  const pageGray=pages.some(p=>Number(p.gray)>0);
  const rgb=Boolean(declared.rgb||pageRgb);
  const cmyk=Boolean(declared.cmyk||pageCmyk);
  const gray=Boolean(declared.gray||pageGray);
  const spot=Boolean(declared.spot);
  const icc=Boolean(declared.icc);

  let label='Undetermined';
  let tone='neutral';
  if(rgb&&cmyk){label='Mixed RGB + CMYK signals';tone='warning';}
  else if(rgb){label=spot?'RGB + spot-color signals':'RGB signals detected';tone='warning';}
  else if(cmyk){label=spot?'CMYK + spot-color signals':'CMYK signals detected';tone='good';}
  else if(spot){label='Spot-color signals detected';tone='neutral';}
  else if(gray){label='Grayscale signals detected';tone='neutral';}
  else if(icc){label='ICC-based color detected';tone='neutral';}

  return {label,tone,rgb,cmyk,gray,spot,icc};
}

export function buildColorReport({fileName='',pageCount=0,raw,pages=[]}={}){
  const verdict=classifyColorFindings({declared:raw?.declared||{},pages});
  return {
    fileName,
    pageCount,
    verdict,
    declared:raw?.declared||{},
    declarationCounts:raw?.counts||{},
    spotNames:raw?.spots||[],
    outputIntent:Boolean(raw?.hasOutputIntent),
    pdfxVersion:raw?.pdfxVersion||'',
    pdfxConformance:raw?.pdfxConformance||'',
    pages
  };
}

export function reportToCsv(report){
  const esc=value=>`"${String(value??'').replace(/"/g,'""')}"`;
  const rows=[['Page','RGB operators','CMYK operators','Gray operators','Other color-space operators']];
  for(const page of report.pages||[])rows.push([page.page,page.rgb||0,page.cmyk||0,page.gray||0,page.colorSpaceOps||0]);
  return rows.map(row=>row.map(esc).join(',')).join('\n');
}
