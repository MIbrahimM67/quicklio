import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
const pages=[
['en/crafts/stencil-maker/index.html','Free Online Stencil Maker','turn a photo'],
['en/crafts/letter-stencil-maker/index.html','Printable Letter & Number Stencil Maker','letter stencil'],
['en/images/image-dpi-changer/index.html','Image DPI Changer & 300 DPI Converter','300 DPI'],
['en/crafts/tattoo-stencil-maker/index.html','Tattoo Stencil Maker From Photo','tattoo stencil'],
['en/images/signature-background-remover/index.html','Signature Background Remover','transparent signature'],
['en/images/silhouette-maker/index.html','Silhouette Maker From Photo','silhouette'],
['en/crafts/cross-stitch-pattern-maker/index.html','Cross Stitch Pattern Maker From Photo','cross-stitch']
];
test('new opportunity pages have unique crawlable SEO essentials',()=>{const canonicals=new Set();for(const[file,h1,phrase]of pages){const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp(`<h1>${h1.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}</h1>`));assert.match(html,/<title>[^<]{20,75}<\/title>/);assert.match(html,/<meta name="description" content="[^"]{80,180}">/);const c=html.match(/<link rel="canonical" href="([^"]+)">/);assert.ok(c);assert.ok(!canonicals.has(c[1]));canonicals.add(c[1]);assert.match(html,new RegExp(phrase,'i'));assert.match(html,/\/assets\/js\/site\.mjs/);assert.match(html,/creative-suite-app\.mjs/)}});
test('new tools cross-link instead of creating isolated pages',()=>{for(const[file]of pages){const html=fs.readFileSync(file,'utf8');const links=[...html.matchAll(/href="(\/en\/[^"]+)"/g)].map(m=>m[1]);assert.ok(links.length>=3,`${file} needs related internal links`)}});
