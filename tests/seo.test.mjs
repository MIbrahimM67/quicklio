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

function get(html,re){return(html.match(re)||[])[1]||''}
function expectedCanonical(file){
  const norm=file.replaceAll('\\','/');
  if(norm==='index.html')return'https://quicklio.app/';
  return'https://quicklio.app/'+norm.replace(/index\.html$/,'');
}

test('robots exposes the canonical sitemap',()=>{
  assert.match(robots,/User-agent:\s*\*/);
  assert.match(robots,/Allow:\s*\//);
  assert.match(robots,/Sitemap:\s*https:\/\/quicklio\.app\/sitemap\.xml/);
});

test('every indexable HTML page has core SEO fields and sitemap coverage',()=>{
  const seenTitles=new Set();
  for(const file of htmlFiles){
    const html=fs.readFileSync(file,'utf8');
    const title=get(html,/<title>([^<]+)<\/title>/i).trim();
    const description=get(html,/<meta name="description" content="([^"]+)"/i).trim();
    const canonical=get(html,/<link rel="canonical" href="([^"]+)"/i).trim();
    const h1s=(html.match(/<h1(?:\s|>)/gi)||[]).length;
    const robotsMeta=get(html,/<meta name="robots" content="([^"]+)"/i).toLowerCase();
    const isNoindex=robotsMeta.includes('noindex');
    assert.ok(title, file+' is missing a title');
    assert.ok(description, file+' is missing a meta description');
    assert.equal(h1s,1,file+' must contain exactly one H1');
    assert.equal(canonical,expectedCanonical(file),file+' has the wrong canonical');
    assert.ok(!seenTitles.has(title),'Duplicate title: '+title);
    seenTitles.add(title);
    if(isNoindex)assert.ok(!sitemap.includes('<loc>'+canonical+'</loc>'),file+' is noindex but appears in sitemap.xml');
    else assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),file+' canonical is missing from sitemap.xml');
  }
});

test('homepage declares site identity and a Google-compatible favicon',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/rel="icon"[^>]+quicklio-favicon\.png/);
  assert.match(html,/"@type":"WebSite"/);
  assert.match(html,/"@type":"Organization"/);
  assert.match(html,/"name":"Quicklio"/);
});

test('tool schema generator stays enabled',()=>{
  const js=fs.readFileSync('assets/js/site.mjs','utf8');
  assert.match(js,/WebApplication/);
  assert.match(js,/BreadcrumbList/);
  assert.match(js,/quicklio-tool-schema/);
});


test('homepage exposes AdSense ownership verification and ads.txt is valid',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const ads=fs.readFileSync('ads.txt','utf8').trim();
  assert.match(html,/<meta name="google-adsense-account" content="ca-pub-2036385623191798">/);
  assert.equal(ads,'google.com, pub-2036385623191798, DIRECT, f08c47fec0942fa0');
});
