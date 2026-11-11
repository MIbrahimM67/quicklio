// Site-wide tool discovery for category hubs. The homepage already has its own
// catalog search; collection hubs need a search that reaches beyond their category.
// Read the canonical homepage catalog so newly published cards are discoverable
// without maintaining a second list of product titles.
import {searchToolCatalog} from '/assets/js/tool-search.mjs';
import {opportunityTools} from '/assets/js/opportunity-tools-discovery.mjs';

const section=document.querySelector('.hub-page main .tools-section');
if(section){
  const categoryLabels={
    image:'Images & photo',pdf:'PDF & print',labels:'Labels',
    social:'Social images',finance:'Money & planning',crafts:'Crafts',
    candle:'Candles',halloween:'Halloween',christmas:'Christmas',
    print:'Printing'
  };

  const block=document.createElement('div');
  block.className='global-tool-search';
  block.innerHTML=`
    <form class="global-tool-search-form" role="search" aria-label="Search all Quicklio tools">
      <div class="global-tool-search-heading">
        <label for="global-tool-query">Find any Quicklio tool</label>
        <p>Search across every category, not just this collection.</p>
      </div>
      <div class="global-tool-search-field">
        <svg class="icon icon-md" aria-hidden="true"><use href="/assets/icons/lucide.svg#i-search"></use></svg>
        <input id="global-tool-query" name="q" type="search" autocomplete="off" spellcheck="false"
          placeholder="Try image, PDF, passport photo, barcode…" aria-controls="global-tool-search-results"
          aria-label="Search all Quicklio tools">
        <button type="submit">Search tools</button>
      </div>
    </form>
    <div class="global-tool-search-results" id="global-tool-search-results" aria-label="Results from all Quicklio tools" hidden>
      <p class="global-tool-search-status" role="status"></p>
      <div class="global-tool-search-grid"></div>
    </div>`;
  section.prepend(block);

  const form=block.querySelector('form');
  const input=block.querySelector('input');
  const results=block.querySelector('.global-tool-search-results');
  const status=block.querySelector('.global-tool-search-status');
  const grid=block.querySelector('.global-tool-search-grid');
  let catalog=[];
  let loaded=false;

  function getLocalCatalog(){
    return [...document.querySelectorAll('.hub-page [data-tool-card]')].map(card=>({
      title:card.querySelector('h3')?.textContent?.trim()||'',
      description:card.querySelector('.tool-card-copy p')?.textContent?.trim()||'',
      keywords:card.dataset.search||'',
      category:card.dataset.category||'',
      path:new URL(card.getAttribute('href')||'/',location.origin).pathname
    }));
  }
  async function getWholeCatalog(){
    const all=new Map();
    // Always include the current page even if the homepage is temporarily unavailable.
    for(const tool of getLocalCatalog())all.set(tool.path,tool);
    try{
      const response=await fetch('/',{credentials:'same-origin'});
      if(!response.ok)throw new Error('Homepage catalog unavailable');
      const page=new DOMParser().parseFromString(await response.text(),'text/html');
      for(const card of page.querySelectorAll('.popular-section [data-tool-card]')){
        const path=new URL(card.getAttribute('href')||'/',location.origin).pathname;
        all.set(path,{
          title:card.querySelector('h3')?.textContent?.trim()||'',
          description:card.querySelector('.tool-card-copy p')?.textContent?.trim()||'',
          keywords:card.dataset.search||'',
          category:card.dataset.category||'',
          path
        });
      }
    }catch(error){
      console.warn('Quicklio global catalog: homepage lookup failed; using local tools',error);
    }
    // These newer tools are added to the homepage by the discovery module.
    for(const tool of opportunityTools){
      all.set(tool.href,{
        title:tool.title,description:tool.desc,keywords:tool.search,
        category:tool.category,path:tool.href
      });
    }
    return [...all.values()].filter(tool=>tool.title&&tool.path);
  }

  function render(){
    const query=input.value.trim();
    const searching=query.length>0;
    section.classList.toggle('is-global-searching',searching);
    results.hidden=!searching;
    if(!searching)return;
    grid.replaceChildren();
    if(!loaded){
      status.textContent='Loading the Quicklio tool directory…';
      return;
    }
    const matches=searchToolCatalog(catalog,query);
    status.textContent=matches.length+' matching '+(matches.length===1?'tool':'tools')+' across Quicklio';
    if(!matches.length){
      const empty=document.createElement('p');
      empty.className='global-tool-search-empty';
      empty.textContent='No matching tools yet. Try a broader search such as image, PDF, print, or photo.';
      grid.append(empty);
      return;
    }
    const fragment=document.createDocumentFragment();
    for(const {tool} of matches){
      const link=document.createElement('a');
      link.className='global-tool-search-result';
      link.href=tool.path;
      const title=document.createElement('strong');
      title.textContent=tool.title;
      const description=document.createElement('span');
      description.textContent=tool.description;
      const category=document.createElement('small');
      category.textContent=categoryLabels[tool.category]||'Tools';
      link.append(category,title,description);
      fragment.append(link);
    }
    grid.append(fragment);
  }

  input.addEventListener('input',render);
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&input.value){
      input.value='';
      render();
    }else if(event.key==='ArrowDown'&&!results.hidden){
      const first=grid.querySelector('a');
      if(first){event.preventDefault();first.focus();}
    }
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    render();
    if(!results.hidden)results.scrollIntoView({block:'nearest',behavior:'auto'});
  });
  const initialQuery=new URLSearchParams(location.search).get('q');
  if(initialQuery)input.value=initialQuery;
  if(input.value.trim())render();
  getWholeCatalog().then(tools=>{
    catalog=tools;
    loaded=true;
    render();
  });
}
