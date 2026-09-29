import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8')}
function write(path,content){fs.writeFileSync(path,content,'utf8')}
function mustReplace(content,from,to,label){
  if(!content.includes(from))throw new Error('Expected source not found: '+label);
  return content.replace(from,to);
}

function replaceFirstToolSchema(path,{name,url,description}){
  let html=read(path);
  let replaced=false;
  html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(full,json)=>{
    if(replaced)return full;
    let data;
    try{data=JSON.parse(json)}catch{return full}
    if(data?.['@type']!=='WebApplication'&&data?.['@type']!=='SoftwareApplication')return full;
    replaced=true;
    const schema={
      '@context':'https://schema.org',
      '@type':'WebPage',
      '@id':url+'#webpage',
      url,
      name,
      description,
      isPartOf:{'@type':'WebSite','@id':'https://quicklio.app/#website'},
      publisher:{'@type':'Organization','@id':'https://quicklio.app/#organization','name':'Quicklio','url':'https://quicklio.app/'}
    };
    return '<script type="application/ld+json">'+JSON.stringify(schema)+'</script>';
  });
  if(!replaced)throw new Error('No WebApplication schema found in '+path);
  write(path,html);
}

// 1) Fix the PDF-to-Word desktop hierarchy if the broken shared grid class is present.
{
  const path='en/pdf/pdf-to-word/index.html';
  let html=read(path);
  if(html.includes('<main class="pdfword-shell tool-workbench">')){
    html=html.replace('<main class="pdfword-shell tool-workbench">','<main class="pdfword-shell">');
    write(path,html);
  }
  if(!read(path).includes('<main class="pdfword-shell">'))throw new Error('PDF to Word main hierarchy is not fixed');
}

// 2) Replace unsupported software-app rich-result declarations with truthful WebPage schema.
replaceFirstToolSchema('en/pdf/pdf-to-word/index.html',{
  name:'PDF to Word Converter',
  url:'https://quicklio.app/en/pdf/pdf-to-word/',
  description:'Convert PDF files to editable Word DOCX files locally in the browser with page ranges, scan detection, optional OCR, and a text preview.'
});
replaceFirstToolSchema('en/pdf/pdf-page-box-editor/index.html',{
  name:'PDF Page Box Editor',
  url:'https://quicklio.app/en/pdf/pdf-page-box-editor/',
  description:'Inspect and edit MediaBox, CropBox, BleedBox, TrimBox, and ArtBox values in a PDF.'
});

// 3) Make the runtime tool schema generic too, so future pages cannot recreate the same Semrush/Google rich-result error.
{
  const path='assets/js/site.mjs';
  let js=read(path);
  const old="    {'@type':'WebApplication','@id':canonical+'#app',name:h1,url:canonical,description:description||undefined,applicationCategory,operatingSystem:'Any',isAccessibleForFree:true,browserRequirements:'Requires a modern web browser with JavaScript enabled',offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},publisher:{'@type':'Organization','@id':'https://quicklio.app/#organization','name':'Quicklio','url':'https://quicklio.app/'}},";
  const next="    {'@type':'WebPage','@id':canonical+'#webpage',name:h1,url:canonical,description:description||undefined,isPartOf:{'@type':'WebSite','@id':'https://quicklio.app/#website'},publisher:{'@type':'Organization','@id':'https://quicklio.app/#organization','name':'Quicklio','url':'https://quicklio.app/'}},";
  if(js.includes(old))js=js.replace(old,next);
  else if(!js.includes("'@type':'WebPage'"))throw new Error('Runtime schema source not found');
  write(path,js);
}

// 4) Strengthen static discovery for the logo background remover.
{
  const logo='/en/images/remove-background-from-logo/';
  const hub='en/images/index.html';
  let html=read(hub);
  if(!html.includes('href="'+logo+'"')){
    const section='<section class="shell" style="padding-bottom:3rem"><h2>Logo & transparency</h2><p>Need a transparent PNG for a logo? <a href="'+logo+'"><strong>Remove a white or solid-color logo background</strong></a> locally in your browser before resizing or exporting it.</p></section>';
    html=mustReplace(html,'</main>',section+'</main>','image hub closing main');
  }
  // Keep CollectionPage ItemList aligned with the visible hub link.
  html=html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,(full,open,json,close)=>{
    let data;try{data=JSON.parse(json)}catch{return full}
    const list=data?.mainEntity?.itemListElement;
    if(!Array.isArray(list))return full;
    if(!list.some(item=>item?.url==='https://quicklio.app'+logo)){
      list.push({'@type':'ListItem',position:list.length+1,name:'Remove Background from Logo',url:'https://quicklio.app'+logo});
    }
    return open+JSON.stringify(data)+close;
  });
  write(hub,html);

  const neighbor='en/images/resize-image-to-exact-kb/index.html';
  let exact=read(neighbor);
  if(!exact.includes('href="'+logo+'"')){
    const related='<section class="shell" style="padding-bottom:2rem"><p><strong>Working with a logo?</strong> If you need transparency first, use <a href="'+logo+'">Remove Background from Logo</a>, then return here to hit the exact KB or pixel requirement.</p></section>';
    exact=mustReplace(exact,'</main>',related+'</main>','exact-KB closing main');
    write(neighbor,exact);
  }
}

// 5) Add browser-layout regression coverage for the exact desktop failure shown in production.
{
  const path='qa/pdf-to-word.spec.mjs';
  let qa=read(path);
  const name='PDF to Word keeps the desktop page hierarchy intact';
  if(!qa.includes(name)){
    qa += `\n\ntest('${name}',async({page})=>{\n  for(const viewport of [{width:1366,height:768},{width:1706,height:864}]){\n    await page.setViewportSize(viewport);\n    await page.goto('/en/pdf/pdf-to-word/');\n    await expect(page.locator('[data-tool-review-cta]')).toBeVisible();\n    const layout=await page.evaluate(()=>{\n      const box=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};\n      const main=document.querySelector('main');\n      const hero=document.querySelector('.pdfword-hero');\n      const grid=document.querySelector('.pdfword-grid');\n      const copy=document.querySelector('.pdfword-copy');\n      const review=document.querySelector('[data-tool-review-cta]');\n      const cards=[...document.querySelectorAll('.pdfword-copy .content-card')].slice(0,2).map(box);\n      return{mainDisplay:getComputedStyle(main).display,main:box(main),hero:box(hero),grid:box(grid),copy:box(copy),review:box(review),cards,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};\n    });\n    expect(layout.mainDisplay).not.toBe('grid');\n    expect(layout.overflow).toBeLessThanOrEqual(2);\n    expect(layout.main.width).toBeGreaterThan(1000);\n    expect(layout.grid.width).toBeGreaterThan(1000);\n    expect(layout.copy.width).toBeGreaterThan(1000);\n    expect(layout.grid.y).toBeGreaterThanOrEqual(layout.hero.bottom-2);\n    expect(layout.copy.y).toBeGreaterThanOrEqual(layout.grid.bottom-2);\n    expect(layout.review.y).toBeGreaterThanOrEqual(layout.copy.bottom-2);\n    expect(layout.review.width).toBeGreaterThan(900);\n    expect(layout.cards).toHaveLength(2);\n    expect(layout.cards[0].width).toBeGreaterThan(450);\n    expect(layout.cards[1].width).toBeGreaterThan(450);\n    expect(Math.abs(layout.cards[0].y-layout.cards[1].y)).toBeLessThanOrEqual(2);\n  }\n});\n`;
    write(path,qa);
  }
}

// 6) Strengthen SEO guardrails: image-hub coverage and no unsupported Software App markup.
{
  const path='tests/seo.test.mjs';
  let test=read(path);
  test=test.replace("  assert.match(js,/WebApplication/);","  assert.match(js,/WebPage/);");
  if(!test.includes("image hub links to every image tool in the sitemap")){
    const marker="test('PDF hub links to every PDF tool in the sitemap',()=>{\n  const html=fs.readFileSync('en/pdf/index.html','utf8');\n  const urls=[...sitemap.matchAll(/<loc>https:\\\/\\\/quicklio\\.app(\\/en\\/pdf\\/[^<]+)<\\\/loc>/g)].map(match=>match[1]).filter(url=>url!=='/en/pdf/');\n  for(const url of urls)assert.ok(html.includes('href=\\\"'+url+'\\\"'),'PDF hub is missing tool link: '+url);\n});\n";
    const addition=marker+"\ntest('image hub links to every image tool in the sitemap',()=>{\n  const html=fs.readFileSync('en/images/index.html','utf8');\n  const urls=[...sitemap.matchAll(/<loc>https:\\\/\\\/quicklio\\.app(\\/en\\/images\\/[^<]+)<\\\/loc>/g)].map(match=>match[1]).filter(url=>url!=='/en/images/');\n  for(const url of urls)assert.ok(html.includes('href=\\\"'+url+'\\\"'),'Image hub is missing tool link: '+url);\n});\n";
    if(!test.includes(marker))throw new Error('PDF hub SEO test marker not found');
    test=test.replace(marker,addition);
  }
  if(!test.includes("software app schema requires real review evidence")){
    test += `\n\ntest('software app schema requires real review evidence',()=>{\n  for(const file of htmlFiles){\n    const html=fs.readFileSync(file,'utf8');\n    for(const block of jsonLdBlocks(html)){\n      const data=JSON.parse(block);\n      const nodes=data?.['@graph']||[data];\n      for(const node of nodes){\n        const types=Array.isArray(node?.['@type'])?node['@type']:[node?.['@type']];\n        if(!types.includes('WebApplication')&&!types.includes('SoftwareApplication'))continue;\n        assert.ok(node?.offers&&node.offers.price!==undefined,file+' software app schema is missing offers.price');\n        assert.ok(node?.review||node?.aggregateRating,file+' software app schema must have a real review or aggregateRating');\n      }\n    }\n  }\n});\n`;
  }
  write(path,test);
}

// Remove obsolete one-time workflows/scripts from this branch before the cleanup commit.
for(const path of ['.github/workflows/fix-pdf-word-layout.yml','.github/workflows/apply-semrush-seo-cleanup.yml','scripts/apply-semrush-seo-cleanup.mjs']){
  if(fs.existsSync(path))fs.rmSync(path);
}

console.log('Semrush SEO cleanup applied.');
