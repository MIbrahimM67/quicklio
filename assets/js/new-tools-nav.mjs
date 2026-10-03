const tools=[
  {href:'/en/crafts/stencil-maker/',category:'crafts',title:'Stencil Maker',desc:'Turn a photo into a cuttable stencil with island bridges.',search:'stencil maker photo image picture convert stencil bridges svg printable',icon:'i-scissors'},
  {href:'/en/crafts/letter-stencil-maker/',category:'crafts',title:'Letter & Number Stencil Maker',desc:'Create printable custom lettering with automatic bridges.',search:'letter stencils stencil letters numbers printable large alphabet font',icon:'i-type'},
  {href:'/en/images/image-dpi-changer/',category:'image',title:'Image DPI Changer',desc:'Set 300 DPI or custom image density with optional resampling.',search:'300 dpi converter change image dpi dpi changer print resolution',icon:'i-ruler'},
  {href:'/en/crafts/tattoo-stencil-maker/',category:'crafts',title:'Tattoo Stencil Maker',desc:'Turn photos or sketches into clean stencil linework.',search:'tattoo stencil maker creator photo linework mirror transfer',icon:'i-pen-line'},
  {href:'/en/images/signature-background-remover/',category:'image',title:'Signature Background Remover',desc:'Remove paper and download a transparent signature.',search:'signature background remover transparent signature remove white paper',icon:'i-pen-line'},
  {href:'/en/images/silhouette-maker/',category:'image',title:'Silhouette Maker',desc:'Turn a photo into a transparent PNG or SVG silhouette.',search:'silhouette maker photo image outline transparent svg',icon:'i-image'},
  {href:'/en/crafts/cross-stitch-pattern-maker/',category:'crafts',title:'Cross Stitch Pattern Maker',desc:'Turn a photo into a symbol chart and color key.',search:'cross stitch pattern maker photo image chart generator',icon:'i-grid'}
];
function card(t){const a=document.createElement('a');a.className='tool-card';a.href=t.href;a.dataset.toolCard='';a.dataset.category=t.category;a.dataset.search=t.search;a.innerHTML=`<span class="tool-card-icon"><svg class="icon icon-xl" aria-hidden="true"><use href="/assets/icons/lucide.svg#${t.icon}"></use></svg></span><span class="tool-card-copy"><h3>${t.title}</h3><p>${t.desc}</p></span><span class="tool-card-arrow"><svg class="icon" aria-hidden="true"><use href="/assets/icons/lucide.svg#i-arrow-right"></use></svg></span>`;return a}
function mega(t){const a=document.createElement('a');a.className='mega-link';a.href=t.href;a.dataset.megaCat=t.category;a.innerHTML=`<span class="mega-icon"><svg class="icon icon-md" aria-hidden="true"><use href="/assets/icons/lucide.svg#${t.icon}"></use></svg></span><span><strong>${t.title}</strong><small>${t.desc}</small></span>`;return a}
const grid=document.querySelector('.tool-card-grid');
if(grid){for(const t of tools)if(!grid.querySelector(`a[href="${t.href}"]`))grid.append(card(t));const eyebrow=document.querySelector('#tools .section-heading .eyebrow');if(eyebrow)eyebrow.textContent=document.querySelectorAll('[data-tool-card]').length+' current tools'}
const groups=[...document.querySelectorAll('.mega-group')];
const imageGroup=groups.find(g=>/Images\s*&?\s*photo/i.test(g.querySelector('.mega-group-title')?.textContent||''));
const craftGroup=groups.find(g=>/Planning\s*&\s*crafts/i.test(g.querySelector('.mega-group-title')?.textContent||''));
for(const t of tools){const parent=t.category==='image'?imageGroup:craftGroup;if(parent&&!parent.querySelector(`a[href="${t.href}"]`))parent.append(mega(t))}
