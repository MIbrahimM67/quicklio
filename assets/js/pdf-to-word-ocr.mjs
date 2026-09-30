function finite(n,fallback=0){const v=Number(n);return Number.isFinite(v)?v:fallback}
function clamp01(n){return Math.max(0,Math.min(1,finite(n)))}
function fontFlags(name=''){const s=String(name);return{bold:/bold|black|semibold|demi/i.test(s),italic:/italic|oblique/i.test(s)}}
function normalizedBox(bbox,width,height){
  if(!bbox||!width||!height)return null;
  const x0=clamp01(finite(bbox.x0)/width),y0=clamp01(finite(bbox.y0)/height),x1=clamp01(finite(bbox.x1)/width),y1=clamp01(finite(bbox.y1)/height);
  if(x1<=x0||y1<=y0)return null;
  return{x0,y0,x1,y1};
}
function lineRuns(line,rtl=false){
  const words=Array.isArray(line?.words)?line.words:[];const runs=[];
  if(words.length){
    for(let i=0;i<words.length;i++){
      const word=words[i];const text=String(word?.text??'').trim();if(!text)continue;
      const flags=fontFlags(word?.font_name);runs.push({text:(runs.length?' ':'')+text,fontSize:0,bold:flags.bold,italic:flags.italic,fontFamily:String(word?.font_name||'').trim(),rtl});
    }
  }
  if(!runs.length){const text=String(line?.text??'').replace(/\s+/g,' ').trim();if(text)runs.push({text,fontSize:0,bold:false,italic:false,fontFamily:'',rtl});}
  return runs;
}
export function ocrBlocksToPositionedParagraphs(blocks=[],renderWidth=0,renderHeight=0,pageWidthPt=612,pageHeightPt=792){
  const rw=Math.max(1,finite(renderWidth,1)),rh=Math.max(1,finite(renderHeight,1));const pw=Math.max(1,finite(pageWidthPt,612)),ph=Math.max(1,finite(pageHeightPt,792));const sx=pw/rw,sy=ph/rh;
  const paragraphs=[],maskBoxes=[];
  for(const block of Array.isArray(blocks)?blocks:[]){
    for(const paragraph of Array.isArray(block?.paragraphs)?block.paragraphs:[]){
      const rtl=paragraph?.is_ltr===false;
      for(const line of Array.isArray(paragraph?.lines)?paragraph.lines:[]){
        const text=String(line?.text??'').replace(/\s+/g,' ').trim();const box=line?.bbox;if(!text||!box)continue;
        const x0=Math.max(0,finite(box.x0)),y0=Math.max(0,finite(box.y0)),x1=Math.min(rw,finite(box.x1,rw)),y1=Math.min(rh,finite(box.y1,rh));if(x1<=x0||y1<=y0)continue;
        const baselineRaw=Math.max(finite(line?.baseline?.y0,y1),finite(line?.baseline?.y1,y1));const baselinePx=Math.max(y0,Math.min(y1,baselineRaw));const fontSize=Math.max(6,Math.min(72,(y1-y0)*sy*.78));
        const runs=lineRuns(line,rtl).map(r=>({...r,fontSize}));const layoutXPt=x0*sx,layoutRightPt=x1*sx,baselinePt=ph-baselinePx*sy,ocrBoxHeightPt=(y1-y0)*sy,ocrBoxWidthPt=(x1-x0)*sx;
        paragraphs.push({text,fontSize,bold:runs.some(r=>r.bold),italic:runs.some(r=>r.italic),rtl,heading:false,bullet:false,align:rtl?'right':'left',leftIndentPt:0,spaceAfterPt:0,lineCount:1,runs,layoutLines:[text],layoutRunLines:[runs],layoutText:text,layoutXPt,layoutRightPt,layoutWidthPt:Math.max(12,layoutRightPt-layoutXPt),layoutFirstBaselinePt:baselinePt,layoutLastBaselinePt:baselinePt,fontAscent:.8,ascent:.8,ocrPositioned:true,ocrBoxHeightPt,ocrBoxWidthPt});
        const words=Array.isArray(line?.words)?line.words:[];let added=0;
        for(const word of words){const n=normalizedBox(word?.bbox,rw,rh);if(n){maskBoxes.push(n);added++;}}
        if(!added){const n=normalizedBox(box,rw,rh);if(n)maskBoxes.push(n);}
      }
    }
  }
  return{paragraphs,maskBoxes};
}

export function clearOcrTextFromCanvas(ctx,boxes=[],width=0,height=0){
  if(!ctx||!Array.isArray(boxes)||!boxes.length||!width||!height)return 0;let cleared=0;ctx.save();
  for(const box of boxes){
    const x0=clamp01(box?.x0)*width,y0=clamp01(box?.y0)*height,x1=clamp01(box?.x1)*width,y1=clamp01(box?.y1)*height;if(x1<=x0||y1<=y0)continue;
    const pad=Math.max(1,Math.min(4,Math.min(width,height)*.0025));ctx.clearRect(Math.max(0,x0-pad),Math.max(0,y0-pad),Math.min(width,x1-x0+pad*2),Math.min(height,y1-y0+pad*2));cleared++;
  }
  ctx.restore();return cleared;
}
