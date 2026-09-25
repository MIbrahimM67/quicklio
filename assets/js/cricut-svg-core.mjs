export const CRICUT_SVG_PATH_LIMIT=5000;

const TAGS={
  path:'path',group:'g',text:'text',image:'image',clipPath:'clipPath',pattern:'pattern',
  linearGradient:'linearGradient',radialGradient:'radialGradient',mask:'mask',filter:'filter',
  foreignObject:'foreignObject',script:'script',use:'use',symbol:'symbol',
  rect:'rect',circle:'circle',ellipse:'ellipse',line:'line',polyline:'polyline',polygon:'polygon'
};
const GEOMETRY_TAGS=['path','rect','circle','ellipse','line','polyline','polygon'];

function countTag(source,tag){
  return (source.match(new RegExp('<\\s*'+tag+'\\b','gi'))||[]).length;
}
function firstSvgTag(source){
  const match=source.match(/<svg\b([^>]*)>/i);
  if(!match)throw Error('This file does not contain an SVG root element.');
  return match[1]||'';
}
function attr(attrs,name){
  const re=new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\\\'([^\\\']*)\\\')','i');
  const m=attrs.match(re);
  return m?(m[1]??m[2]??''):null;
}
function numList(value){
  if(!value)return null;
  const nums=value.trim().split(/[\s,]+/).map(Number);
  return nums.length===4&&nums.every(Number.isFinite)?nums:null;
}
function countPathCommands(source){
  let total=0;
  const re=/<path\b[^>]*\bd\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
  let m;
  while((m=re.exec(source))) total+=((m[1]??m[2]??'').match(/[AaCcHhLlMmQqSsTtVvZz]/g)||[]).length;
  return total;
}
function externalRefs(source){
  const re=/\b(?:href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  const refs=[]; let m;
  while((m=re.exec(source))){
    const value=(m[1]??m[2]??'').trim();
    if(value&&!value.startsWith('#')&&!value.startsWith('data:'))refs.push(value);
  }
  return refs;
}
function hasDataImage(source){
  return /<image\b[^>]*(?:href|xlink:href)\s*=\s*(?:"data:image\/|'data:image\/)/i.test(source);
}
function hasGradientUse(source){
  return /(?:fill|stroke)\s*=\s*(?:"url\(#|'url\(#)/i.test(source)
    || /(?:fill|stroke)\s*:\s*url\(#/i.test(source);
}
function formatRootDimensions(attrs){
  const width=attr(attrs,'width'),height=attr(attrs,'height'),viewBoxRaw=attr(attrs,'viewBox');
  const viewBox=numList(viewBoxRaw);
  return{
    width,widthRaw:width,
    height,heightRaw:height,
    viewBoxRaw,
    viewBox:viewBox?{minX:viewBox[0],minY:viewBox[1],width:viewBox[2],height:viewBox[3]}:null
  };
}
function plural(n,singular,pluralWord){return n===1?singular:(pluralWord||singular+'s')}
function issue(code,severity,title,detail,source='Cricut'){
  return{code,severity,title,detail,source};
}

export function analyzeSvgText(source,{fileSize=0}={}){
  if(typeof source!=='string'||!source.trim())throw Error('Choose a non-empty SVG file.');
  const trimmed=source.trim();
  const attrs=firstSvgTag(trimmed);
  const counts={};
  for(const [key,tag] of Object.entries(TAGS))counts[key]=countTag(trimmed,tag);
  counts.geometry=GEOMETRY_TAGS.reduce((sum,key)=>sum+(counts[key]||0),0);
  counts.nonPathGeometry=counts.geometry-counts.path;
  counts.pathCommands=countPathCommands(trimmed);

  const dimensions=formatRootDimensions(attrs);
  const refs=externalRefs(trimmed);
  const issues=[];

  if(counts.path>CRICUT_SVG_PATH_LIMIT){
    issues.push(issue(
      'path-limit','error',
      'More than 5,000 explicit paths',
      'This SVG contains '+counts.path.toLocaleString('en-US')+' <path> elements. Cricut says SVG uploads are restricted to 5,000 paths and files above that limit cause an upload error.'
    ));
  }

  if(counts.clipPath){
    issues.push(issue('clipping-path','error','Clipping paths detected',counts.clipPath.toLocaleString('en-US')+' '+plural(counts.clipPath,'<clipPath> element')+' found. Cricut lists clipping paths as unsupported for SVG/DXF image upload.'));
  }
  if(counts.text){
    issues.push(issue('editable-text','error','Editable text detected',counts.text.toLocaleString('en-US')+' '+plural(counts.text,'<text> element')+' found. Cricut says text must be converted to shapes/outlines before SVG/DXF upload.'));
  }
  if(counts.pattern){
    issues.push(issue('pattern','error','Pattern definitions detected',counts.pattern.toLocaleString('en-US')+' '+plural(counts.pattern,'<pattern> element')+' found. Cricut lists pattern fills as unsupported.'));
  }
  const gradients=counts.linearGradient+counts.radialGradient;
  if(gradients&&hasGradientUse(trimmed)){
    issues.push(issue('gradient','error','Gradient fill or stroke detected',gradients.toLocaleString('en-US')+' '+plural(gradients,'gradient definition')+' found and the SVG references a URL-based fill/stroke. Cricut\'s unsupported-items guidance includes gradients under pattern fills.'));
  }else if(gradients){
    issues.push(issue('gradient-definition','warning','Gradient definitions are present',gradients.toLocaleString('en-US')+' '+plural(gradients,'gradient definition')+' present. Quicklio did not confirm that the definition is actively used; remove unused gradients before upload if possible.','Quicklio'));
  }

  if(counts.image){
    if(refs.length){
      issues.push(issue('linked-image','error','Linked image/reference detected',counts.image.toLocaleString('en-US')+' '+plural(counts.image,'<image> element')+' found and the file contains external references. Cricut lists linked images as unsupported.'));
    }else if(hasDataImage(trimmed)){
      issues.push(issue('embedded-image','error','Embedded raster image detected',counts.image.toLocaleString('en-US')+' embedded '+plural(counts.image,'<image> element')+' found. Cricut says SVG/DXF uploads cannot contain non-vector images.'));
    }else{
      issues.push(issue('image-element','error','Image element detected',counts.image.toLocaleString('en-US')+' '+plural(counts.image,'<image> element')+' found. Cricut\'s upload guidance warns against linked and embedded non-vector images in SVG files.'));
    }
  }else if(refs.length){
    issues.push(issue('external-reference','warning','External reference detected',refs.length.toLocaleString('en-US')+' external href '+plural(refs.length,'reference')+' found. External dependencies can make an SVG less portable and are removed from Quicklio\'s preview.','Quicklio'));
  }

  if(counts.mask)issues.push(issue('mask','warning','SVG mask detected',counts.mask.toLocaleString('en-US')+' '+plural(counts.mask,'<mask> element')+' found. Cricut\'s cited unsupported-items article does not explicitly document SVG masks, so Quicklio flags this for review rather than calling it an official blocker.','Quicklio'));
  if(counts.filter)issues.push(issue('filter','warning','SVG filter detected',counts.filter.toLocaleString('en-US')+' '+plural(counts.filter,'<filter> element')+' found. Filters are not treated as a documented Cricut blocker here, but they may not translate into cut geometry as expected.','Quicklio'));
  if(counts.foreignObject)issues.push(issue('foreign-object','warning','foreignObject detected',counts.foreignObject.toLocaleString('en-US')+' '+plural(counts.foreignObject,'<foreignObject> element')+' found. This is web content rather than normal cut geometry and is removed from the preview.','Quicklio'));
  if(counts.script)issues.push(issue('script','warning','Script content detected',counts.script.toLocaleString('en-US')+' '+plural(counts.script,'<script> element')+' found. Scripts are not needed for a Cricut cut file and are removed from Quicklio\'s preview.','Quicklio'));
  if(!dimensions.viewBox)issues.push(issue('viewbox','warning','No valid viewBox found','A viewBox makes SVG scaling more predictable. The file may still upload, but its imported size can be harder to reason about.','Quicklio'));
  if(counts.path<=CRICUT_SVG_PATH_LIMIT&&counts.geometry>CRICUT_SVG_PATH_LIMIT){
    issues.push(issue('geometry-count','warning','More than 5,000 vector geometry elements','The file has '+counts.geometry.toLocaleString('en-US')+' vector geometry elements in total, including '+counts.nonPathGeometry.toLocaleString('en-US')+' non-path primitives. Cricut publishes a 5,000-path limit but does not explain in the cited help article how every non-path SVG primitive is counted after import, so Quicklio does not label this an official failure.','Quicklio'));
  }

  const blockers=issues.filter(x=>x.severity==='error');
  const warnings=issues.filter(x=>x.severity==='warning');
  let state='pass',title='No documented blocker found';
  if(blockers.length){state='fail';title=counts.path>CRICUT_SVG_PATH_LIMIT?'Likely blocked by Cricut':'Unsupported Cricut SVG items found';}
  else if(warnings.length){state='review';title='Path count passes — review warnings';}

  return{
    state,title,
    pathLimit:CRICUT_SVG_PATH_LIMIT,
    counts,dimensions,
    fileSize:Number(fileSize)||0,
    externalRefs:refs,
    issues,blockers,warnings,
    summary:{
      explicitPaths:counts.path,
      remainingPaths:Math.max(0,CRICUT_SVG_PATH_LIMIT-counts.path),
      overBy:Math.max(0,counts.path-CRICUT_SVG_PATH_LIMIT),
      hasKnownUnsupported:blockers.some(x=>x.code!=='path-limit')
    }
  };
}
