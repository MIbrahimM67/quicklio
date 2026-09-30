document.documentElement.classList.add('js');

/* ── Google Analytics 4 with explicit analytics consent ── */
const QUICKLIO_GA_ID='G-72360H1LTV';
const QUICKLIO_CONSENT_KEY='quicklio_analytics_consent_v1';
window.dataLayer=window.dataLayer||[];
window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};

gtag('consent','default',{
  analytics_storage:'denied',
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied'
});

let quicklioGaLoaded=false;
function loadQuicklioAnalytics(){
  if(quicklioGaLoaded)return;
  quicklioGaLoaded=true;
  gtag('consent','update',{
    analytics_storage:'granted',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  });
  gtag('js',new Date());
  gtag('config',QUICKLIO_GA_ID);
  const script=document.createElement('script');
  script.async=true;
  script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(QUICKLIO_GA_ID);
  document.head.append(script);
}

function readAnalyticsConsent(){
  try{return localStorage.getItem(QUICKLIO_CONSENT_KEY)}catch{return null}
}
function quicklioAnalyticsEnabled(){
  return readAnalyticsConsent()==='granted'&&quicklioGaLoaded;
}
function quicklioTrack(eventName,params={}){
  if(!quicklioAnalyticsEnabled())return false;
  gtag('event',eventName,params);
  return true;
}
window.quicklioTrack=quicklioTrack;
function saveAnalyticsConsent(value){
  try{localStorage.setItem(QUICKLIO_CONSENT_KEY,value)}catch{}
}
function removeConsentBanner(){
  document.querySelector('[data-analytics-consent]')?.remove();
}
function applyAnalyticsChoice(value){
  saveAnalyticsConsent(value);
  removeConsentBanner();
  if(value==='granted')loadQuicklioAnalytics();
  else gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
}
function showAnalyticsConsent(){
  if(document.querySelector('[data-analytics-consent]'))return;
  const banner=document.createElement('section');
  banner.className='analytics-consent';
  banner.dataset.analyticsConsent='';
  banner.setAttribute('aria-label','Analytics privacy choices');
  banner.innerHTML='<div class="analytics-consent-copy"><strong>Help improve Quicklio?</strong><p>With your permission, Quicklio uses Google Analytics to understand traffic and how people use the tools. Analytics stays off until you accept. No advertising cookies are enabled.</p><a href="/privacy/">Privacy details</a></div><div class="analytics-consent-actions"><button class="button primary small" type="button" data-analytics-accept>Accept analytics</button><button class="button small" type="button" data-analytics-decline>Decline</button></div>';
  banner.querySelector('[data-analytics-accept]').addEventListener('click',()=>applyAnalyticsChoice('granted'));
  banner.querySelector('[data-analytics-decline]').addEventListener('click',()=>applyAnalyticsChoice('denied'));
  document.body.append(banner);
}
function addAnalyticsPreferenceControl(){
  const legal=document.querySelector('.footer-links>div:last-child');
  if(!legal||legal.querySelector('[data-analytics-preferences]'))return;
  const button=document.createElement('button');
  button.type='button';
  button.className='footer-text-button';
  button.dataset.analyticsPreferences='';
  button.textContent='Privacy choices';
  button.addEventListener('click',showAnalyticsConsent);
  legal.append(button);
}

const savedAnalyticsConsent=readAnalyticsConsent();
if(savedAnalyticsConsent==='granted')loadQuicklioAnalytics();
else if(savedAnalyticsConsent!=='denied')showAnalyticsConsent();
addAnalyticsPreferenceControl();


const allDetails=[...document.querySelectorAll('.nav-details')];
for(const item of allDetails){
  item.addEventListener('toggle',()=>{
    if(!item.open)return;
    for(const other of allDetails)if(other!==item)other.removeAttribute('open');
  });
}
document.addEventListener('pointerdown',(event)=>{
  if(event.target.closest('.nav-details'))return;
  for(const item of allDetails)item.removeAttribute('open');
});

/* ── mega-menu: hover a left category → filter right-side tools ── */
(function(){
  const cats=[...document.querySelectorAll('.mega-category[data-mega-cat]')];
  const links=[...document.querySelectorAll('.mega-link[data-mega-cat]')];
  const groups=[...document.querySelectorAll('.mega-group')];
  if(!cats.length||!links.length)return;

  function activate(cat){
    for(const c of cats)c.classList.toggle('is-mega-active',c.dataset.megaCat===cat);
    if(cat==='all'||cat==='languages'){
      for(const l of links)l.classList.remove('is-mega-hidden');
      for(const g of groups)g.classList.remove('is-mega-hidden');
      return;
    }
    for(const l of links)l.classList.toggle('is-mega-hidden',l.dataset.megaCat!==cat);
    for(const g of groups){
      const visible=[...g.querySelectorAll('.mega-link[data-mega-cat]')].some(l=>l.dataset.megaCat===cat);
      g.classList.toggle('is-mega-hidden',!visible);
    }
  }
  function reset(){
    for(const c of cats)c.classList.remove('is-mega-active');
    for(const l of links)l.classList.remove('is-mega-hidden');
    for(const g of groups)g.classList.remove('is-mega-hidden');
  }
  for(const c of cats)c.addEventListener('mouseenter',()=>activate(c.dataset.megaCat));
  const panel=document.querySelector('.mega-panel');
  if(panel)panel.addEventListener('mouseleave',reset);
})();

/* ── Homepage tool subcategories ── */
(function(){
  if(!document.body.classList.contains('site-home'))return;
  const grid=document.querySelector('.tool-card-grid');
  const homepageCards=grid?[...grid.querySelectorAll(':scope > [data-tool-card]')]:[];
  if(!grid||!homepageCards.length||grid.dataset.grouped==='true')return;

  const definitions=[
    {id:'pdf-essentials',title:'PDF Essentials',description:'Convert, organize, edit, and manage everyday PDF files.'},
    {id:'print-prepress',title:'Print & Prepress',description:'Prepare PDFs, labels, booklets, and artwork for reliable printing.'},
    {id:'images-photos',title:'Images & Photos',description:'Edit, resize, prepare, and print images without uploading them.'},
    {id:'labels-social',title:'Labels & Social',description:'Build printable labels and prepare images for social platforms.'},
    {id:'crafts-makers',title:'Crafts & Makers',description:'Practical tools for Cricut, yarn, candles, and maker workflows.'},
    {id:'money-planning',title:'Money & Planning',description:'Simple planning tools for everyday money decisions.'},
    {id:'seasonal',title:'Seasonal',description:'Useful calculators and creative tools for holidays and events.'}
  ];

  const printPaths=new Set([
    '/en/pdf/pdf-page-box-editor/',
    '/en/pdf/pdf-booklet-signature-maker/',
    '/en/print/split-image-for-printing/',
    '/en/pdf/add-bleed-and-crop-marks/',
    '/en/pdf/resize-shipping-label-to-4x6/',
    '/en/pdf/add-binding-margin-to-pdf/'
  ]);

  function groupIdFor(card){
    const category=card.dataset.category||'';
    let path='';
    try{path=new URL(card.getAttribute('href')||'',location.origin).pathname}catch{}
    if(printPaths.has(path))return'print-prepress';
    if(category==='pdf')return'pdf-essentials';
    if(category==='image')return'images-photos';
    if(category==='labels'||category==='social')return'labels-social';
    if(category==='crafts'||category==='candle')return'crafts-makers';
    if(category==='finance')return'money-planning';
    if(category==='halloween'||category==='christmas')return'seasonal';
    return'pdf-essentials';
  }

  grid.dataset.grouped='true';
  grid.classList.add('is-grouped');

  const jumpNav=document.createElement('nav');
  jumpNav.className='tool-subcategory-nav';
  jumpNav.setAttribute('aria-label','Tool subcategories');
  jumpNav.innerHTML='<span>Jump to</span>';
  grid.before(jumpNav);

  for(const definition of definitions){
    const section=document.createElement('section');
    section.className='tool-subcategory';
    section.id='tools-'+definition.id;
    section.dataset.toolGroup=definition.id;

    const head=document.createElement('div');
    head.className='tool-subcategory-head';
    head.innerHTML='<div class="tool-subcategory-title"><strong>'+definition.title+'</strong><span>'+definition.description+'</span></div><span class="tool-subcategory-count" data-tool-group-count></span>';

    const inner=document.createElement('div');
    inner.className='tool-subcategory-grid';
    for(const card of homepageCards)if(groupIdFor(card)===definition.id)inner.append(card);
    if(!inner.children.length)continue;

    section.append(head,inner);
    grid.append(section);

    const jump=document.createElement('a');
    jump.href='#'+section.id;
    jump.dataset.toolGroupJump=definition.id;
    jump.textContent=definition.title;
    jumpNav.append(jump);
  }

  const style=document.createElement('style');
  style.id='quicklio-home-tool-groups-style';
  style.textContent=`
    .site-home .tool-card-grid.is-grouped{display:block}
    .site-home .tool-subcategory-nav{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:1.15rem 0 1.75rem}
    .site-home .tool-subcategory-nav>span{font-size:.75rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--color-muted)}
    .site-home .tool-subcategory-nav a{display:inline-flex;align-items:center;min-height:2.15rem;padding:.45rem .72rem;border:1px solid var(--color-rule);border-radius:999px;background:rgba(255,255,255,.72);color:var(--color-ink);font-size:.84rem;font-weight:700;text-decoration:none;transition:transform var(--dur-short) var(--ease-out),background var(--dur-short) var(--ease-out),border-color var(--dur-short) var(--ease-out)}
    .site-home .tool-subcategory-nav a:hover{transform:translateY(-1px);background:#fff;border-color:rgba(17,17,17,.24)}
    .site-home .tool-subcategory{scroll-margin-top:6rem}
    .site-home .tool-subcategory+.tool-subcategory{margin-top:2.25rem}
    .site-home .tool-subcategory-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:.85rem;padding-bottom:.62rem;border-bottom:1px solid var(--color-rule)}
    .site-home .tool-subcategory-title strong{display:block;font-size:1.18rem;line-height:1.2}
    .site-home .tool-subcategory-title span{display:block;margin-top:.22rem;color:var(--color-muted);font-size:.88rem;line-height:1.45}
    .site-home .tool-subcategory-count{flex:0 0 auto;padding:.3rem .55rem;border:1px solid var(--color-rule);border-radius:999px;background:rgba(255,255,255,.6);color:var(--color-muted);font-size:.72rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
    .site-home .tool-subcategory-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:.85rem}
    @media (min-width:42rem){.site-home .tool-subcategory-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media (min-width:70rem){.site-home .tool-subcategory-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
    @media (max-width:41.99rem){.site-home .tool-subcategory-head{align-items:flex-start}.site-home .tool-subcategory-count{margin-top:.05rem}.site-home .tool-subcategory-title span{max-width:28rem}}
  `;
  document.head.append(style);
})();

const search=document.querySelector('[data-tool-search]');
const cards=[...document.querySelectorAll('[data-tool-card]')];
const filters=[...document.querySelectorAll('[data-tool-filter]')];
const allowedFilters=new Set(['all','image','pdf','labels','social','finance','crafts','candle','halloween','christmas']);
const requestedFilter=new URLSearchParams(location.search).get('category');
let activeFilter=allowedFilters.has(requestedFilter)?requestedFilter:'all';

function applyToolFilter(){
  if(!cards.length)return;
  const q=(search?.value||'').trim().toLowerCase();
  let visible=0;
  for(const card of cards){
    const category=card.dataset.category||'';
    const haystack=(card.dataset.search||card.textContent||'').toLowerCase();
    const matchesCategory=activeFilter==='all'||category===activeFilter;
    const matchesSearch=!q||haystack.includes(q);
    const show=matchesCategory&&matchesSearch;
    card.hidden=!show;
    if(show)visible++;
  }

  const groups=[...document.querySelectorAll('[data-tool-group]')];
  for(const group of groups){
    const visibleCards=[...group.querySelectorAll('[data-tool-card]')].filter(card=>!card.hidden);
    group.hidden=visibleCards.length===0;
    const count=group.querySelector('[data-tool-group-count]');
    if(count)count.textContent=visibleCards.length+' '+(visibleCards.length===1?'tool':'tools');
  }
  for(const jump of document.querySelectorAll('[data-tool-group-jump]')){
    const group=groups.find(item=>item.dataset.toolGroup===jump.dataset.toolGroupJump);
    jump.hidden=!group||group.hidden;
  }

  const empty=document.querySelector('[data-tools-empty]');
  if(empty)empty.hidden=visible>0;
}

for(const button of filters){
  button.classList.toggle('is-active',button.dataset.toolFilter===activeFilter);
  button.addEventListener('click',()=>{
    activeFilter=button.dataset.toolFilter||'all';
    for(const other of filters)other.classList.toggle('is-active',other===button);
    applyToolFilter();
  });
}
search?.addEventListener('input',applyToolFilter);
function trackSiteSearch(){
  const q=(search?.value||'').trim();
  if(!q)return;
  const visibleCards=cards.filter(card=>!card.hidden);
  quicklioTrack('site_search_used',{
    query_length:q.length,
    result_count:visibleCards.length,
    had_result:visibleCards.length?1:0,
    category_filter:activeFilter
  });
}
const openFirstMatch=()=>{
  const first=cards.find(card=>!card.hidden);
  trackSiteSearch();
  if(first?.href)location.href=first.href;
};
search?.addEventListener('keydown',(event)=>{
  if(event.key!=='Enter')return;
  openFirstMatch();
});
document.querySelector('.tool-search button')?.addEventListener('click',openFirstMatch);
applyToolFilter();

for(const shareButton of document.querySelectorAll('[data-share-quicklio]')){
  shareButton.addEventListener('click',async()=>{
    const payload={title:'Quicklio',text:'Simple tools for everyday problems.',url:location.origin||'https://quicklio.app/'};
    try{
      if(navigator.share){await navigator.share(payload);return;}
      await navigator.clipboard.writeText(payload.url);
      const label=shareButton.querySelector('span')||shareButton;
      const old=label.textContent;
      label.textContent='Link copied';
      setTimeout(()=>label.textContent=old,1600);
    }catch{}
  });
}



/* ── Product usage analytics: tool starts, completions, downloads, and cross-tool clicks ── */
(function(){
  if(!document.body.classList.contains('tool-page'))return;

  const canonical=document.querySelector('link[rel="canonical"]')?.href||location.href;
  let toolUrl;
  try{toolUrl=new URL(canonical,location.href)}catch{toolUrl=new URL(location.href)}
  const segments=toolUrl.pathname.split('/').filter(Boolean);
  const toolCategory=segments[1]||'other';
  const toolName=segments[2]||segments.at(-1)||'unknown';
  const toolPath=toolUrl.pathname;
  const toolMeta={tool_name:toolName,tool_category:toolCategory,tool_path:toolPath};
  const root=document.querySelector('.tool-workbench')||document.querySelector('main');
  if(!root)return;

  let toolStarted=false;
  let toolCompleted=false;
  let completionCheckQueued=false;

  function startTool(interactionType){
    if(toolStarted||!quicklioAnalyticsEnabled())return;
    toolStarted=true;
    quicklioTrack('tool_started',{...toolMeta,interaction_type:interactionType});
    queueCompletionCheck();
  }

  function completeTool(method){
    if(toolCompleted||!toolStarted||!quicklioAnalyticsEnabled())return;
    toolCompleted=true;
    quicklioTrack('tool_completed',{...toolMeta,completion_method:method});
  }

  function isVisible(el){
    if(!el||el.hidden||el.getAttribute('aria-hidden')==='true')return false;
    const style=getComputedStyle(el);
    return style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&el.getClientRects().length>0;
  }

  function hasMeaningfulResult(el){
    if(!isVisible(el))return false;
    if(el.matches('.error,[role="alert"].error')||el.querySelector('.error:not([hidden])'))return false;
    const text=(el.textContent||'').replace(/\s+/g,' ').trim();
    const visual=el.querySelector('canvas,img[src],svg,video');
    return text.length>=3||Boolean(visual);
  }

  function detectCompletion(){
    completionCheckQueued=false;
    if(!toolStarted||toolCompleted)return;
    const candidates=root.querySelectorAll('[data-result],[id*="result" i],[class*="result" i],[id*="output" i],[class*="output" i]');
    for(const el of candidates){
      if(hasMeaningfulResult(el)){
        completeTool('result_visible');
        break;
      }
    }
  }

  function queueCompletionCheck(){
    if(completionCheckQueued)return;
    completionCheckQueued=true;
    requestAnimationFrame(()=>requestAnimationFrame(detectCompletion));
  }

  const actionable='input,select,textarea,button,[contenteditable="true"],[draggable="true"],.drop,label.drop';
  for(const type of['input','change','drop']){
    root.addEventListener(type,event=>{
      const target=event.target instanceof Element?event.target:null;
      if(target&&(target.closest(actionable)||type==='drop'))startTool(type);
      queueCompletionCheck();
    },true);
  }
  root.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest(actionable):null;
    if(!target||target.matches('[disabled],[aria-disabled="true"]'))return;
    startTool('click');
    queueCompletionCheck();
  },true);

  const observer=new MutationObserver(()=>queueCompletionCheck());
  observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','aria-hidden','disabled','src']});

  const programmaticDownloads=new WeakSet();
  const nativeAnchorClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(...args){
    const isDownload=this.hasAttribute('download')||Boolean(this.download);
    if(isDownload){
      programmaticDownloads.add(this);
      if(!toolStarted)startTool('download');
      const extension=(this.download.match(/\.([a-z0-9]{1,8})$/i)||[])[1]?.toLowerCase()||'unknown';
      quicklioTrack('download_clicked',{...toolMeta,file_extension:extension,download_method:'programmatic'});
      completeTool('download');
      queueMicrotask(()=>programmaticDownloads.delete(this));
    }
    return nativeAnchorClick.apply(this,args);
  };

  document.addEventListener('click',event=>{
    const link=event.target instanceof Element?event.target.closest('a[href]'):null;
    if(!link)return;

    if((link.hasAttribute('download')||link.download)&&!programmaticDownloads.has(link)){
      if(!toolStarted)startTool('download');
      const extension=(link.download.match(/\.([a-z0-9]{1,8})$/i)||[])[1]?.toLowerCase()||'unknown';
      quicklioTrack('download_clicked',{...toolMeta,file_extension:extension,download_method:'user_click'});
      completeTool('download');
      return;
    }

    if(!link.closest('main'))return;
    let targetUrl;
    try{targetUrl=new URL(link.href,location.href)}catch{return}
    if(targetUrl.origin!==location.origin||targetUrl.pathname===location.pathname)return;
    const targetSegments=targetUrl.pathname.split('/').filter(Boolean);
    if(targetSegments[0]!=='en'||targetSegments.length<3)return;
    quicklioTrack('related_tool_clicked',{
      ...toolMeta,
      target_tool:targetSegments[2],
      target_category:targetSegments[1]
    });
  },true);
})();

/* ── Tool review CTA ── */
(function(){
  if(!document.body.classList.contains('tool-page'))return;
  const main=document.querySelector('main');
  if(!main||main.querySelector('[data-tool-review-cta]'))return;
  const h1=document.querySelector('h1')?.textContent?.trim()||'this tool';
  const cta=document.createElement('section');
  cta.className='shell tool-review-cta';
  cta.dataset.toolReviewCta='';
  const url='/review/?tool='+encodeURIComponent(location.pathname);
  cta.innerHTML='<div><span class="eyebrow">Help improve Quicklio</span><h2>Did '+h1+' work for you?</h2><p>Leave a quick review. No account is required, and your feedback helps decide what we improve next.</p></div><a class="button primary" href="'+url+'"><svg class="icon" aria-hidden="true"><use href="/assets/icons/lucide.svg#i-star"></use></svg><span>Leave a review</span></a>';
  main.append(cta);
})();

/* ── SEO entities, crawlable hub links, and tool breadcrumbs ── */
(function(){
  const hubRoutes={image:'/en/images/',pdf:'/en/pdf/',crafts:'/en/crafts/'};
  for(const link of document.querySelectorAll('.mega-category[data-mega-cat]')){
    const route=hubRoutes[link.dataset.megaCat];
    if(route)link.href=route;
  }

  const canonical=document.querySelector('link[rel="canonical"]')?.href;
  const description=document.querySelector('meta[name="description"]')?.content?.trim();
  const h1=document.querySelector('h1')?.textContent?.trim();
  const isTool=document.body.classList.contains('tool-page')&&canonical&&h1;
  if(!isTool)return;

  const parts=new URL(canonical).pathname.split('/').filter(Boolean);
  const rawCategory=parts[1]||'';
  const categoryKey=rawCategory==='images'?'image':rawCategory==='pdf'||rawCategory==='print'?'pdf':rawCategory==='crafts'?'crafts':rawCategory;
  const categoryNames={image:'Image & Photo Tools',pdf:'PDF & Print Tools',crafts:'Craft Tools',finance:'Money Tools',labels:'Label Tools',social:'Social Image Tools',candles:'Candle Tools',halloween:'Halloween Tools',christmas:'Christmas Tools'};
  const applicationCategory={finance:'FinanceApplication',image:'DesignApplication',social:'DesignApplication',crafts:'LifestyleApplication',candles:'LifestyleApplication',halloween:'LifestyleApplication',christmas:'LifestyleApplication'}[categoryKey]||'UtilitiesApplication';

  const breadcrumb=document.createElement('nav');
  breadcrumb.className='seo-breadcrumb shell';
  breadcrumb.setAttribute('aria-label','Breadcrumb');
  const crumbs=[{name:'Home',url:'https://quicklio.app/'}];
  if(hubRoutes[categoryKey])crumbs.push({name:categoryNames[categoryKey],url:'https://quicklio.app'+hubRoutes[categoryKey]});
  crumbs.push({name:h1,url:canonical});
  breadcrumb.innerHTML=crumbs.map((c,i)=>i===crumbs.length-1?'<span aria-current="page">'+c.name+'</span>':'<a href="'+new URL(c.url).pathname+'">'+c.name+'</a><span aria-hidden="true">/</span>').join('');
  document.querySelector('.tool-hero')?.before(breadcrumb);

  const graph=[
    {'@type':'WebPage','@id':canonical+'#webpage',name:h1,url:canonical,description:description||undefined,isPartOf:{'@type':'WebSite','@id':'https://quicklio.app/#website'},publisher:{'@type':'Organization','@id':'https://quicklio.app/#organization','name':'Quicklio','url':'https://quicklio.app/'}},
    {'@type':'BreadcrumbList',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,name:c.name,item:c.url}))}
  ];
  const schema=document.createElement('script');
  schema.type='application/ld+json';
  schema.id='quicklio-tool-schema';
  schema.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph});
  document.head.append(schema);
})();