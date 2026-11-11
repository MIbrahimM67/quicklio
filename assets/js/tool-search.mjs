// Search metadata comes from the displayed tool cards, including newly added tools.
// All matching happens locally; no third-party search or user-query upload.
const IMAGE_TERMS=new Set(['image','images','photo','photos','picture','pictures','pic','pics','photograph','photographs','graphic','graphics']);
const PDF_TERMS=new Set(['pdf','pdfs']);
const ALIAS_GROUPS=[
  [...IMAGE_TERMS], [...PDF_TERMS],
  ['jpg','jpeg'], ['word','docx'],
  ['resize','resizing','resized','scale','scaling','dimensions','dimension'],
  ['compress','compression','compressed','shrink','reduce','smaller','optimize','optimise'],
  ['background','bg','backdrop'], ['transparent','transparency'],
  ['convert','conversion','converter'], ['crop','cropping','trim','trimming'],
  ['print','printing','printer','printable'], ['remove','remover','erase','delete'],
  ['stencil','stencils'], ['barcode','barcodes'], ['qr','qrcode'],
  ['instagram','insta'], ['cricut','designspace']
];
const STOP_WORDS=new Set(['a','an','the','for','to','of','with','my','and','online','tool','tools','free']);
const IMAGE_WORKFLOW_PATHS=new Set([
  '/en/pdf/pdf-to-jpg/',
  '/en/pdf/image-to-pdf/',
  '/en/print/split-image-for-printing/',
  '/en/social/instagram-no-crop-image-resizer/',
  '/en/halloween/pumpkin-stencil-maker/',
  '/en/crafts/stencil-maker/',
  '/en/crafts/tattoo-stencil-maker/',
  '/en/crafts/cross-stitch-pattern-maker/',
  '/en/crafts/cricut-sticker-maker/'
]);
const normalize=text=>String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const words=text=>normalize(text).split(' ').filter(Boolean);
const aliasesFor=token=>ALIAS_GROUPS.find(group=>group.includes(token))||[token];

function roughlyMatches(query,term){
  if(term===query)return 3;
  if(query.length>=3&&term.startsWith(query))return 2;
  if(query.length<5||Math.abs(query.length-term.length)>1||query[0]!==term[0])return 0;
  // One insertion, deletion, substitution, or adjacent letter transposition.
  if(query.length===term.length){
    const differences=[];
    for(let i=0;i<query.length;i++)if(query[i]!==term[i])differences.push(i);
    if(differences.length===1)return 1;
    if(differences.length===2&&differences[1]===differences[0]+1 &&
      query[differences[0]]===term[differences[1]]&&query[differences[1]]===term[differences[0]])return 1;
    return 0;
  }
  const longer=query.length>term.length?query:term;
  const shorter=query.length>term.length?term:query;
  let i=0,j=0,skips=0;
  while(i<longer.length){
    if(longer[i]===shorter[j]){i++;j++;}
    else if(++skips>1)return 0;
    else i++;
  }
  return 1;
}

function fieldScore(token,field,weight,allowTypo=false){
  let best=0;
  for(const alias of aliasesFor(token)){
    for(const word of field){
      const match=allowTypo?roughlyMatches(alias,word):(word===alias?3:alias.length>=3&&word.startsWith(alias)?2:0);
      if(match)best=Math.max(best,weight*(match===3?1:match===2?.7:.35));
    }
  }
  return best;
}

function scoreToken(token,entry){
  const {titleWords,descriptionWords,keywordWords,category,path,title}=entry;
  let score=Math.max(
    fieldScore(token,titleWords,45,true),
    fieldScore(token,keywordWords,16,true),
    fieldScore(token,descriptionWords,12,false)
  );
  if(IMAGE_TERMS.has(token)){
    const imageRelated=category==='image'||IMAGE_WORKFLOW_PATHS.has(path)||
      /\b(image|photo|picture|stencil|sticker|silhouette|jpg|jpeg|png|webp)\b/.test(title);
    if(!imageRelated)return 0;
    score=Math.max(score,category==='image'?80:36);
  }else if(PDF_TERMS.has(token)&&category==='pdf')score=Math.max(score,60);
  else if(normalize(category)===token)score=Math.max(score,48);
  return score;
}

export function searchToolCatalog(catalog,query){
  const normalized=normalize(query);
  const terms=[...new Set(words(normalized).filter(token=>!STOP_WORDS.has(token)))];
  if(!terms.length)return catalog.map((tool,index)=>({tool,score:0,index}));
  return catalog.map((tool,index)=>{
    const title=normalize(tool.title);
    const entry={
      title,
      titleWords:words(tool.title),
      descriptionWords:words(tool.description),
      keywordWords:words(tool.keywords),
      category:tool.category||'',
      path:tool.path||''
    };
    const scores=terms.map(token=>scoreToken(token,entry));
    if(scores.some(score=>!score))return null;
    const phraseBonus=title===normalized?220:title.includes(normalized)?130:0;
    return {tool,score:scores.reduce((sum,score)=>sum+score,0)+phraseBonus,index};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index);
}
