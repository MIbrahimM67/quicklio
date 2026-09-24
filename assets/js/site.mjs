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

const search=document.querySelector('[data-tool-search]');
const cards=[...document.querySelectorAll('[data-tool-card]')];
const filters=[...document.querySelectorAll('[data-tool-filter]')];
let activeFilter='all';

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
  button.addEventListener('click',()=>{
    activeFilter=button.dataset.toolFilter||'all';
    for(const other of filters)other.classList.toggle('is-active',other===button);
    applyToolFilter();
  });
}
search?.addEventListener('input',applyToolFilter);
search?.addEventListener('keydown',(event)=>{
  if(event.key!=='Enter')return;
  const first=cards.find(card=>!card.hidden);
  if(first?.href)location.href=first.href;
});
applyToolFilter();

for(const shareButton of document.querySelectorAll('[data-share-quicklio]')){
  shareButton.addEventListener('click',async()=>{
    const payload={title:'Quicklio',text:'Simple tools for everyday problems.',url:location.origin||'https://quicklio.app/'};
    try{
      if(navigator.share){await navigator.share(payload);return;}
      await navigator.clipboard.writeText(payload.url);
      shareButton.textContent='Link copied';
      setTimeout(()=>shareButton.textContent='Share Quicklio',1600);
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
