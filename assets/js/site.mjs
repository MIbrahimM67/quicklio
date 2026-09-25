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

const reviewForm=document.querySelector('[data-review-form]');
if(reviewForm){
  let rating=5;
  const stars=[...reviewForm.querySelectorAll('[data-rating]')];
  for(const star of stars){
    star.addEventListener('click',()=>{
      rating=Number(star.dataset.rating)||5;
      for(const s of stars)s.classList.toggle('is-active',Number(s.dataset.rating)<=rating);
    });
  }
  reviewForm.addEventListener('submit',(event)=>{
    event.preventDefault();
    const message=reviewForm.querySelector('textarea')?.value?.trim()||'';
    const subject=encodeURIComponent(`Quicklio review — ${rating}/5`);
    const body=encodeURIComponent(`Rating: ${rating}/5\n\n${message}`);
    location.href=`mailto:feedback@quicklio.app?subject=${subject}&body=${body}`;
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
    {'@type':'WebApplication','@id':canonical+'#app',name:h1,url:canonical,description:description||undefined,applicationCategory,operatingSystem:'Any',isAccessibleForFree:true,browserRequirements:'Requires a modern web browser with JavaScript enabled',offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},publisher:{'@type':'Organization','@id':'https://quicklio.app/#organization','name':'Quicklio','url':'https://quicklio.app/'}},
    {'@type':'BreadcrumbList',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,name:c.name,item:c.url}))}
  ];
  const schema=document.createElement('script');
  schema.type='application/ld+json';
  schema.id='quicklio-tool-schema';
  schema.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph});
  document.head.append(schema);
})();
