const SPACE_KEYS=['DeviceRGB','DeviceCMYK','DeviceGray','CalRGB','CalGray','Lab','ICCBased','Indexed','Separation','DeviceN'];

function asBytes(input){
  if(input instanceof Uint8Array)return input;
  if(input instanceof ArrayBuffer)return new Uint8Array(input);
  if(typeof input==='string')return new TextEncoder().encode(input);
  throw new TypeError('Expected PDF bytes or a string.');
}

function asText(input){
  if(typeof input==='string')return input;
  return new TextDecoder('latin1').decode(asBytes(input));
}

function countToken(text,name){
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return(text.match(new RegExp(`/${escaped}(?=[\\s<>\\[\\]()/]|$)`,'g'))||[]).length;
}

function decodePdfName(name=''){
  return name.replace(/#([0-9A-Fa-f]{2})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
}

function unique(values){return[...new Set(values.filter(Boolean))];}

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

function skipPdfString(text,start){
  let depth=1;
  let escaped=false;
  for(let i=start+1;i<text.length;i++){
    const ch=text[i];
    if(escaped){escaped=false;continue;}
    if(ch==='\\'){escaped=true;continue;}
    if(ch==='(')depth++;
    else if(ch===')'&&--depth===0)return i+1;
  }
  return text.length;
}

function sanitizeContentStream(text){
  let out='';
  for(let i=0;i<text.length;){
    const ch=text[i];
    if(ch==='%'){
      const nl=text.indexOf('\n',i+1);
      if(nl<0)break;
      out+='\n';i=nl+1;continue;
    }
    if(ch==='('){i=skipPdfString(text,i);out+=' ';continue;}
    if(ch==='<'&&text[i+1]!=='<'){
      const end=text.indexOf('>',i+1);
      i=end<0?text.length:end+1;out+=' ';continue;
    }
    out+=ch;i++;
  }
  return out;
}

function countContentPaintOperators(text){
  const clean=sanitizeContentStream(text);
  const tokens=clean.match(/[^\s]+/g)||[];
  const result={rgb:0,cmyk:0,gray:0};
  for(const token of tokens){
    if(token==='rg'||token==='RG')result.rgb++;
    else if(token==='k'||token==='K')result.cmyk++;
    else if(token==='g'||token==='G')result.gray++;
  }
  return result;
}

function looksLikeContentStream(text){
  const clean=sanitizeContentStream(text);
  return /(?:^|\s)(?:q|Q|BT|ET|cm|Do|Tf|Tj|TJ|Td|TD|Tm|re|m|l|c|v|y|S|s|f|f\*|B|B\*|b|b\*|n)(?=\s|$)/.test(clean)
    || /(?:^|\s)(?:rg|RG|k|K|g|G)(?=\s|$)/.test(clean);
}

function streamFilterKind(dict=''){
  const filterArray=dict.match(/\/Filter\s*\[([^\]]{0,500})\]/s);
  if(filterArray){
    const names=[...filterArray[1].matchAll(/\/([A-Za-z0-9]+)/g)].map(m=>m[1]);
    if(names.length===1&&(names[0]==='FlateDecode'||names[0]==='Fl'))return'flate';
    return'unsupported';
  }
  const single=dict.match(/\/Filter\s*\/([A-Za-z0-9]+)/);
  if(!single)return'plain';
  return(single[1]==='FlateDecode'||single[1]==='Fl')?'flate':'unsupported';
}

function shouldSkipStream(dict=''){
  return /\/Subtype\s*\/(?:Image|Type1C|CIDFontType0C|OpenType)\b/.test(dict)
    || /\/Type\s*\/(?:ObjStm|XRef|Metadata|EmbeddedFile)\b/.test(dict)
    || /\/Filter\s*\/(?:DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode)\b/.test(dict);
}

function findPdfStreams(bytes){
  const text=new TextDecoder('latin1').decode(bytes);
  const streams=[];
  const streamRe=/stream\r?\n/g;
  let match;
  while((match=streamRe.exec(text))){
    const streamKeywordStart=match.index;
    const dataStart=streamRe.lastIndex;
    const objectStart=Math.max(text.lastIndexOf(' obj',streamKeywordStart),text.lastIndexOf('\nobj',streamKeywordStart));
    const contextStart=objectStart>=0?objectStart:Math.max(0,streamKeywordStart-4096);
    const dictContext=text.slice(contextStart,streamKeywordStart);
    if(shouldSkipStream(dictContext))continue;

    const lengthMatch=dictContext.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
    let dataEnd=-1;
    if(lengthMatch){
      const length=Number(lengthMatch[1]);
      if(Number.isFinite(length)&&length>=0&&dataStart+length<=bytes.length)dataEnd=dataStart+length;
    }
    if(dataEnd<0){
      const end=text.indexOf('endstream',dataStart);
      if(end<0)continue;
      dataEnd=end;
      while(dataEnd>dataStart&&(text[dataEnd-1]==='\r'||text[dataEnd-1]==='\n'))dataEnd--;
    }
    streams.push({bytes:bytes.slice(dataStart,dataEnd),filter:streamFilterKind(dictContext)});
    streamRe.lastIndex=Math.max(streamRe.lastIndex,dataEnd);
  }
  return streams;
}

async function inflateBytes(bytes){
  if(typeof DecompressionStream!=='function')throw new Error('Deflate decompression is unavailable.');
  const input=new Blob([bytes]).stream();
  const output=input.pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(output).arrayBuffer());
}

export async function scanPdfContentPaintOperators(input){
  const bytes=asBytes(input);
  const total={rgb:0,cmyk:0,gray:0,scannedStreams:0,decodedStreams:0,skippedStreams:0};
  for(const stream of findPdfStreams(bytes)){
    let decoded=stream.bytes;
    if(stream.filter==='unsupported'){total.skippedStreams++;continue;}
    if(stream.filter==='flate'){
      try{decoded=await inflateBytes(stream.bytes);total.decodedStreams++;}
      catch{total.skippedStreams++;continue;}
    }
    const content=new TextDecoder('latin1').decode(decoded);
    if(!looksLikeContentStream(content))continue;
    const counts=countContentPaintOperators(content);
    total.rgb+=counts.rgb;
    total.cmyk+=counts.cmyk;
    total.gray+=counts.gray;
    total.scannedStreams++;
  }
  return total;
}

export function scanPdfColorSpaces(input){
  const text=asText(input);
  const counts=Object.fromEntries(SPACE_KEYS.map(name=>[name,countToken(text,name)]));
  const spots=extractSpotNames(text);
  const hasOutputIntent=/\/OutputIntents?\b/.test(text)||/\/OutputIntent\b/.test(text);
  const pdfxVersion=extractLiteralAfterKey(text,'GTS_PDFXVersion');
  const pdfxConformance=extractLiteralAfterKey(text,'GTS_PDFXConformance');
  return{
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

export function classifyColorFindings({declared={},pages=[],originalPaint={}}={}){
  const originalTotal=Number(originalPaint.rgb||0)+Number(originalPaint.cmyk||0)+Number(originalPaint.gray||0);
  const pageRgb=pages.some(p=>Number(p.rgb)>0);
  const pageCmyk=pages.some(p=>Number(p.cmyk)>0);
  const pageGray=pages.some(p=>Number(p.gray)>0);
  const rgb=Boolean(declared.rgb||Number(originalPaint.rgb)>0||(originalTotal===0&&pageRgb));
  const cmyk=Boolean(declared.cmyk||Number(originalPaint.cmyk)>0||pageCmyk);
  const gray=Boolean(declared.gray||Number(originalPaint.gray)>0||(originalTotal===0&&pageGray));
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

  return{label,tone,rgb,cmyk,gray,spot,icc};
}

export function buildColorReport({fileName='',pageCount=0,raw,pages=[]}={}){
  const originalPaint=raw?.originalPaint||{};
  const verdict=classifyColorFindings({declared:raw?.declared||{},pages,originalPaint});
  return{
    fileName,
    pageCount,
    verdict,
    declared:raw?.declared||{},
    declarationCounts:raw?.counts||{},
    originalPaint,
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
