import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{thresholdMask,findIslands,addAutoBridges,maskToSvg}from'../assets/js/opportunity-image-core.mjs';import{patchPngDpi,readPngDpi}from'../assets/js/png-dpi.mjs';
test('stencil engine finds enclosed islands and auto-bridges them',()=>{const w=7,h=7,m=new Uint8Array(w*h);for(let y=1;y<6;y++)for(let x=1;x<6;x++)m[y*w+x]=1;for(let y=2;y<5;y++)for(let x=2;x<5;x++)m[y*w+x]=0;assert.equal(findIslands(m,w,h).length,1);const fixed=addAutoBridges(m,w,h,1).mask;assert.equal(findIslands(fixed,w,h).length,0)});
test('threshold and SVG export produce deterministic cut geometry',()=>{const gray=new Uint8ClampedArray([0,120,200,255]);const m=thresholdMask(gray,2,2,{threshold:150});assert.deepEqual([...m],[1,1,0,0]);const svg=maskToSvg(m,2,2,{physicalWidthIn:4});assert.match(svg,/viewBox="0 0 2 2"/);assert.match(svg,/width="4in"/);assert.match(svg,/<path/)});
test('PNG DPI writer stores physical density metadata',()=>{const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8Dwn4Hh/38AD/kD/Wj/froAAAAASUVORK5CYII=','base64'));const patched=patchPngDpi(png,300);assert.ok(patched.length>png.length);assert.ok(Math.abs(readPngDpi(patched)-300)<.1);assert.ok(Buffer.from(patched).includes(Buffer.from('pHYs')))});
const pages=[
['en/crafts/stencil-maker/index.html','Free Online Stencil Maker','turn a photo'],
['en/crafts/letter-stencil-maker/index.html','Letter & Number Stencil Maker','printable letter'],
['en/crafts/tattoo-stencil-maker/index.html','Tattoo Stencil Maker','tattoo stencil'],
['en/crafts/cross-stitch-pattern-maker/index.html','Cross Stitch Pattern Maker From Photo','cross-stitch'],
['en/images/image-dpi-changer/index.html','Image DPI Changer & 300 DPI Converter','300 DPI'],
['en/images/signature-background-remover/index.html','Signature Background Remover','transparent'],
['en/images/silhouette-maker/index.html','Silhouette Maker','silhouette']];
for(const[file,h1,phrase]of pages)test(file+' has indexable SEO and shared runtime',()=>{const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp(`<h1>${h1.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}</h1>`));assert.match(html,/rel="canonical"/);assert.match(html,/meta name="description"/);assert.match(html,/\/assets\/js\/site\.mjs/);assert.match(html,/opportunity-tools-app\.mjs/);assert.match(html,new RegExp(phrase,'i'))});
test('all seven new routes are present in sitemap',()=>{const xml=fs.readFileSync('sitemap.xml','utf8');for(const[file]of pages){const route='/'+file.replace(/index\.html$/,'');assert.ok(xml.includes('https://quicklio.app'+route),route)}});
