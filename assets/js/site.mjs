document.documentElement.classList.add('js');

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
const openFirstMatch=()=>{
  const first=cards.find(card=>!card.hidden);
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
