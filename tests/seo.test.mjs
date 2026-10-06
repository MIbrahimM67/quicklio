import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import path from'node:path';

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(['.git','node_modules','playwright-report','test-results'].includes(entry.name))return[];
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}
const htmlFiles=walk('.').filter(p=>p.endsWith('index.html'));
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const robots=fs.readFileSync('robots.txt','utf8');
const discovery=fs.readFileSync('assets/js/opportunity-tools-discovery.mjs','utf8');

function get(html,re){return(html.match(re)||[])[1]||''}
function expectedCanonical(file){
  const norm=file.replaceAll('\\','/');
  if(norm==='index.html')return'https://quicklio.app/';
  return'https://quicklio.app/'+norm.replace(/index\.html$/,'');
}
function jsonLdBlocks(html){
  return[...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1].trim()).filter(Boolean);
}
function discoveredIn(html,url){return html.includes('href="'+url+'"')||discovery.includes(`href:'${url}'`)}

test('robots exposes the canonical sitemap',()=>{
  assert.match(robots,/User-agent:\s*\*/);
  assert.match(robots,/Allow:\s*\//);
  assert.match(robots,/Sitemap:\s*https:\/\/quicklio\.app\/sitemap\.xml/);
});

test('sitemap contains unique HTTPS apex canonical URLs only',()=>{
  const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1].trim());
  assert.ok(urls.length,'sitemap must contain URLs');
  assert.equal(new Set(urls).size,urls.length,'sitemap contains duplicate URLs');
  for(const url of urls){
    const parsed=new URL(url);
    assert.equal(parsed.protocol,'https:',url+' must use HTTPS');
    assert.equal(parsed.hostname,'quicklio.app',url+' must use the apex Quicklio host');
    assert.equal(parsed.search,'',url+' must not include a query string');
    assert.equal(parsed.hash,'',url+' must not include a fragment');
  }
});

test('every indexable HTML page has core SEO fields and sitemap coverage',()=>{
  const seenTitles=new Set();
  const seenCanonicals=new Set();
  for(const file of htmlFiles){
    const html=fs.readFileSync(file,'utf8');
    const title=get(html,/<title>([^<]+)<\/title>/i).trim();
    const description=get(html,/<meta name="description" content="([^"]+)"/i).trim();
    const canonical=get(html,/<link rel="canonical" href="([^"]+)"/i).trim();
    const h1s=(html.match(/<h1(?:\s|>)/gi)||[]).length;
    const robotsMeta=get(html,/<meta name="robots" content="([^"]+)"/i).toLowerCase();
    const isNoindex=robotsMeta.includes('noindex');
    assert.ok(title,file+' is missing a title');
    assert.ok(description,file+' is missing a meta description');
    assert.equal(h1s,1,file+' must contain exactly one H1');
    assert.equal(canonical,expectedCanonical(file),file+' has the wrong canonical');
    assert.ok(canonical.startsWith('https://quicklio.app/'),file+' canonical must use HTTPS apex host');
    assert.ok(!seenTitles.has(title),'Duplicate title: '+title);
    assert.ok(!seenCanonicals.has(canonical),'Duplicate canonical: '+canonical);
    seenTitles.add(title);
    seenCanonicals.add(canonical);
    if(isNoindex)assert.ok(!sitemap.includes('<loc>'+canonical+'</loc>'),file+' is noindex but appears in sitemap.xml');
    else assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),file+' canonical is missing from sitemap.xml');
  }
});

test('static JSON-LD blocks are valid JSON',()=>{
  for(const file of htmlFiles){
    const html=fs.readFileSync(file,'utf8');
    for(const block of jsonLdBlocks(html))assert.doesNotThrow(()=>JSON.parse(block),file+' has invalid JSON-LD');
  }
});

test('homepage discovery links to every current tool in the sitemap',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const urls=[...sitemap.matchAll(/<loc>https:\/\/quicklio\.app(\/en\/[^<]+)<\/loc>/g)].map(match=>match[1]);
  const toolPaths=urls.filter(url=>url.split('/').filter(Boolean).length>=3);
  for(const url of toolPaths)assert.ok(discoveredIn(html,url),'Homepage/discovery is missing tool link: '+url);
});

test('PDF hub links to every PDF tool in the sitemap',()=>{
  const html=fs.readFileSync('en/pdf/index.html','utf8');
  const urls=[...sitemap.matchAll(/<loc>https:\/\/quicklio\.app(\/en\/pdf\/[^<]+)<\/loc>/g)].map(match=>match[1]).filter(url=>url!=='/en/pdf/');
  for(const url of urls)assert.ok(html.includes('href="'+url+'"'),'PDF hub is missing tool link: '+url);
});

test('image hub statically links to every image tool in the sitemap',()=>{
  const html=fs.readFileSync('en/images/index.html','utf8');
  const urls=[...sitemap.matchAll(/<loc>https:\/\/quicklio\.app(\/en\/images\/[^<]+)<\/loc>/g)].map(match=>match[1]).filter(url=>url!=='/en/images/');
  for(const url of urls)assert.ok(html.includes('href="'+url+'"'),'Image hub is missing static tool link: '+url);
});

test('craft hub statically links to every craft tool in the sitemap',()=>{
  const html=fs.readFileSync('en/crafts/index.html','utf8');
  const urls=[...sitemap.matchAll(/<loc>https:\/\/quicklio\.app(\/en\/crafts\/[^<]+)<\/loc>/g)].map(match=>match[1]).filter(url=>url!=='/en/crafts/');
  for(const url of urls)assert.ok(html.includes('href="'+url+'"'),'Craft hub is missing static tool link: '+url);
});

test('homepage declares site identity and a Google-compatible favicon',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/rel="icon"[^>]+quicklio-favicon\.png/);
  assert.match(html,/"@type":"WebSite"/);
  assert.match(html,/"@type":"Organization"/);
  assert.match(html,/"name":"Quicklio"/);
});

test('tool schema generator stays enabled',()=>{
  const js=fs.readFileSync('assets/js/site.mjs','utf8')+'\n'+fs.readFileSync('assets/js/site-base.mjs','utf8');
  assert.match(js,/WebPage/);
  assert.match(js,/BreadcrumbList/);
  assert.match(js,/quicklio-tool-schema/);
});

test('homepage exposes AdSense ownership verification and ads.txt is valid',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const ads=fs.readFileSync('ads.txt','utf8').trim();
  assert.match(html,/<meta name="google-adsense-account" content="ca-pub-2036385623191798">/);
  assert.equal(ads,'google.com, pub-2036385623191798, DIRECT, f08c47fec0942fa0');
});

test('software app schema requires real review evidence',()=>{
  for(const file of htmlFiles){
    const html=fs.readFileSync(file,'utf8');
    for(const block of jsonLdBlocks(html)){
      const data=JSON.parse(block);
      const nodes=data?.['@graph']||[data];
      for(const node of nodes){
        const types=Array.isArray(node?.['@type'])?node['@type']:[node?.['@type']];
        if(!types.includes('WebApplication')&&!types.includes('SoftwareApplication'))continue;
        assert.ok(node?.offers&&node.offers.price!==undefined,file+' software app schema is missing offers.price');
        assert.ok(node?.review||node?.aggregateRating,file+' software app schema must have a real review or aggregateRating');
      }
    }
  }
});

test('PDF to Word keeps the validated keyword map on one canonical page',()=>{
  const html=fs.readFileSync('en/pdf/pdf-to-word/index.html','utf8').toLowerCase();
  assert.match(html,/<title>[^<]*pdf to word converter/);
  assert.match(html,/convert scanned pdf to word with ocr/);
  assert.match(html,/make pdf text editable in word/);
  assert.match(html,/is this pdf to word converter free\?/);
  assert.match(html,/does quicklio upload my pdf\?/);
  assert.ok(!sitemap.includes('pdf-to-word-online'),'Do not split PDF to Word synonyms into doorway URLs');
  assert.ok(!sitemap.includes('pdf-to-docx'),'Do not split PDF to DOCX into a duplicate tool URL');
});
