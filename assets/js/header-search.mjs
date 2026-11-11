// Compact header search shared by homepage, collection hubs, and every tool page.
// Uses the same local ranking logic as the main catalog, with no search service.
import {searchToolCatalog} from '/assets/js/tool-search.mjs';
import {opportunityTools} from '/assets/js/opportunity-tools-discovery.mjs';

const headerInner=document.querySelector('.site-header .header-inner');
if(headerInner&&!headerInner.querySelector('[data-header-search]')){
  const root=document.createElement('div');
  root.className='header-search';
  root.dataset.headerSearch='';
  root.innerHTML=`
    <button class="header-search-toggle" type="button" aria-label="Search Quicklio tools"
      aria-expanded="false" aria-controls="header-search-form">
      <svg class="icon icon-md" aria-hidden="true"><use href="/assets/icons/lucide.svg#i-search"></use></svg>
    </button>
    <form class="header-search-form" id="header-search-form" role="search" action="/" method="get" aria-label="Search all Quicklio tools">
      <button class="header-search-submit" type="submit" aria-label="Search tools">
        <svg class="icon icon-md" aria-hidden="true"><use href="/assets/icons/lucide.svg#i-search"></use></svg>
      </button>
      <input class="header-search-input" type="search" name="q" aria-label="Search all Quicklio tools"
        placeholder="Search tools…" autocomplete="off" spellcheck="false"
        aria-controls="header-search-results" aria-expanded="false">
    </form>
    <div class="header-search-results" id="header-search-results" hidden>
      <p class="header-search-status" role="status"></p>
      <div class="header-search-list"></div>
    </div>`;
  const mobileNav=headerInner.querySelector('.mobile-nav');
  if(mobileNav)headerInner.insertBefore(root,mobileNav);
  else headerInner.append(root);

  const toggle=root.querySelector('.header-search-toggle');
  const form=root.querySelector('form');
  const input=root.querySelector('input');
  const panel=root.querySelector('.header-search-results');
  const status=root.querySelector('.header-search-status');
  const list=root.querySelector('.header-search-list');
  let catalog=[];
  let catalogPromise;
  let requestVersion=0;

  function pageCatalog(){
    return [...document.querySelectorAll('.popular-section [data-tool-card], .hub-page main [data-tool-card]')].map(card=>({
      title:card.querySelector('h3')?.textContent?.trim()||'',
      description:card.querySelector('.tool-card-copy p')?.textContent?.trim()||'',
      keywords:card.dataset.search||'',
      category:card.dataset.category||'',
      path:new URL(card.getAttribute('href')||'/',location.origin).pathname
    }));
  }
  function loadCatalog(){
    if(catalogPromise)return catalogPromise;
    catalogPromise=(async()=>{
      const byPath=new Map();
      for(const tool of pageCatalog())byPath.set(tool.path,tool);
      if(!document.querySelector('.popular-section [data-tool-card]')){
        try{
          const response=await fetch('/',{credentials:'same-origin'});
          if(response.ok){
            const page=new DOMParser().parseFromString(await response.text(),'text/html');
            for(const card of page.querySelectorAll('.popular-section [data-tool-card]')){
              const path=new URL(card.getAttribute('href')||'/',location.origin).pathname;
              byPath.set(path,{
                title:card.querySelector('h3')?.textContent?.trim()||'',
                description:card.querySelector('.tool-card-copy p')?.textContent?.trim()||'',
                keywords:card.dataset.search||'',
                category:card.dataset.category||'',
                path
              });
            }
          }
        }catch(error){console.warn('Header search directory fallback',error);}
      }
      // Newly released tools are appended by the opportunity discovery module.
      for(const tool of opportunityTools){
        byPath.set(tool.href,{title:tool.title,description:tool.desc,keywords:tool.search,
          category:tool.category,path:tool.href});
      }
      catalog=[...byPath.values()].filter(tool=>tool.title&&tool.path);
      return catalog;
    })();
    return catalogPromise;
  }

  function closeSearch(){
    root.classList.remove('is-open');
    toggle.setAttribute('aria-expanded','false');
    input.setAttribute('aria-expanded','false');
    panel.hidden=true;
  }
  function openSearch(){
    root.classList.add('is-open');
    toggle.setAttribute('aria-expanded','true');
    input.focus();
    loadCatalog().then(()=>{if(input.value.trim())render();});
  }
  function render(){
    const query=input.value.trim();
    const version=++requestVersion;
    input.setAttribute('aria-expanded',query?'true':'false');
    panel.hidden=!query;
    if(!query){list.replaceChildren();return;}
    status.textContent='Finding tools…';
    list.replaceChildren();
    loadCatalog().then(()=>{
      if(version!==requestVersion||!input.value.trim())return;
      const ranked=searchToolCatalog(catalog,input.value.trim());
      status.textContent=ranked.length+' matching '+(ranked.length===1?'tool':'tools');
      list.replaceChildren();
      if(!ranked.length){
        const hint=document.createElement('p');
        hint.className='header-search-empty';
        hint.textContent='No matching tools. Try image, PDF, passport, or barcode.';
        list.append(hint);
        return;
      }
      for(const {tool} of ranked.slice(0,6)){
        const link=document.createElement('a');
        link.className='header-search-result';
        link.href=tool.path;
        const title=document.createElement('strong');
        title.textContent=tool.title;
        const description=document.createElement('small');
        description.textContent=tool.description;
        link.append(title,description);
        list.append(link);
      }
      if(ranked.length>6){
        const more=document.createElement('a');
        more.className='header-search-more';
        more.href='/?q='+encodeURIComponent(input.value.trim())+'#tools';
        more.textContent='See all '+ranked.length+' matching tools';
        list.append(more);
      }
    });
  }

  toggle.addEventListener('click',()=>{
    if(root.classList.contains('is-open')){closeSearch();toggle.focus();}
    else openSearch();
  });
  input.addEventListener('focus',()=>{loadCatalog();if(input.value.trim())render();});
  input.addEventListener('input',render);
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      event.preventDefault();
      if(input.value.trim()){input.value='';render();}
      else {closeSearch();toggle.focus();}
    }
    if(event.key==='ArrowDown'&&!panel.hidden){
      const first=list.querySelector('a');
      if(first){event.preventDefault();first.focus();}
    }
  });
  form.addEventListener('submit',event=>{
    if(!input.value.trim()){
      event.preventDefault();
      openSearch();
    }
  });
  document.addEventListener('pointerdown',event=>{
    if(!root.contains(event.target))closeSearch();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&root.classList.contains('is-open')&&document.activeElement!==input)
      closeSearch();
  });
  // Accessible shortcut on desktop: slash opens search when not typing in a field.
  document.addEventListener('keydown',event=>{
    const element=event.target;
    if(event.key==='/'&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&
       !(element instanceof Element&&element.closest('input,textarea,select,[contenteditable="true"]'))){
      event.preventDefault();openSearch();
    }
  });
}
