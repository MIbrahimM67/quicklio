const path=location.pathname;

const blocks={
  '/en/christmas/christmas-lights-calculator/':{
    eyebrow:'Christmas tree planning',
    title:'Christmas tree light count chart',
    html:`<p>There is no single correct number of lights for every tree because branch density, bulb size, spacing, and the look you want all change the result. Current retailer guidance gives a useful starting range: Home Depot recommends about <strong>100 mini lights per vertical foot</strong> on a full tree, while Lowe's commonly suggests about <strong>100 lights per 1 to 1.5 feet</strong> for a basic indoor-tree look. Use the calculator above when you know your actual tree height, coverage, or string length instead of treating a rule of thumb as a fixed requirement.</p>
      <div class="seo-demand-table-wrap"><table class="seo-demand-table"><thead><tr><th>Tree height</th><th>Practical starting range</th></tr></thead><tbody><tr><td>4 ft</td><td>About 270–400 mini lights</td></tr><tr><td>6 ft</td><td>About 400–600 mini lights</td></tr><tr><td>7.5 ft</td><td>About 500–750 mini lights</td></tr><tr><td>9 ft</td><td>About 600–900 mini lights</td></tr></tbody></table></div>
      <p class="seo-demand-note">These ranges are derived from the two retailer rules above and are planning estimates, not electrical-load limits. Always follow the light manufacturer's maximum end-to-end connection and indoor/outdoor safety instructions.</p>
      <p class="seo-demand-sources">Reference guidance: <a href="https://www.homedepot.com/c/ab/christmas-lights-buying-guide/9ba683603be9fa5395fab90b88ff20a">Home Depot Christmas Lights Buying Guide</a> and <a href="https://www.lowes.com/n/how-to/decorate-christmas-tree">Lowe's Christmas Tree Decorating Guide</a>.</p>`
  },
  '/en/halloween/halloween-candy-calculator/':{
    eyebrow:'Halloween planning',
    title:'How much Halloween candy should I buy?',
    html:`<p>A useful estimate starts with four inputs: expected trick-or-treaters, pieces per visitor, a buffer for busier-than-expected traffic, and the approximate number of pieces in each bag. The basic planning formula is <strong>visitors × pieces each × (1 + buffer)</strong>. Divide the result by the pieces per bag and round up to get the number of bags to buy.</p>
      <p>Example: 150 expected visitors × 3 pieces each with a 15% buffer gives 517.5 pieces, so plan for about <strong>518 pieces</strong>. If the candy you are buying contains about 100 pieces per bag, that means <strong>6 bags</strong> after rounding up. The calculator above does this math for your own inputs and can also estimate total cost when you enter a price per bag.</p>
      <p class="seo-demand-note">Neighborhood traffic can vary sharply by street, weather, local events, and year. If you have last year's visitor count, use it as your starting estimate rather than relying on a generic national average.</p>`
  },
  '/en/halloween/pumpkin-stencil-maker/':{
    eyebrow:'Carving workflow',
    title:'Make a pumpkin carving stencil that survives cutting',
    html:`<p>For pumpkin carving, a good stencil is not just a high-contrast picture. Small isolated shapes can disappear when you cut them out, while very thin bridges can tear during carving. Start with a clear subject, reduce unnecessary background detail, and keep important facial or object features connected to the surrounding pumpkin surface.</p>
      <p>If you need more control over bridge placement or want a reusable stencil outside pumpkin carving, use the <a href="/en/crafts/stencil-maker/">general Stencil Maker</a> and read the <a href="/guides/stencil-islands-bridges/">stencil islands and bridges guide</a>.</p>`
  }
};

const block=blocks[path];
if(block){
  const main=document.querySelector('main');
  if(main&&!main.querySelector('[data-search-demand-support]')){
    const section=document.createElement('section');
    section.className='shell';
    section.dataset.searchDemandSupport='';
    section.innerHTML=`<div class="guide-card seo-demand-card"><p class="eyebrow">${block.eyebrow}</p><h2>${block.title}</h2>${block.html}</div>`;
    main.append(section);
  }
}

if(Object.prototype.hasOwnProperty.call(blocks,path)&&!document.getElementById('quicklio-search-demand-style')){
  const style=document.createElement('style');
  style.id='quicklio-search-demand-style';
  style.textContent=`
    .seo-demand-card{margin:2rem 0 0}
    .seo-demand-card h2{margin:.25rem 0 .75rem}
    .seo-demand-card p{max-width:72ch}
    .seo-demand-table-wrap{overflow-x:auto;margin:1rem 0}
    .seo-demand-table{width:100%;max-width:42rem;border-collapse:collapse;background:rgba(255,255,255,.72)}
    .seo-demand-table th,.seo-demand-table td{text-align:left;padding:.72rem .8rem;border:1px solid var(--color-rule)}
    .seo-demand-table th{font-weight:800}
    .seo-demand-note{font-size:.92rem;color:var(--color-muted)}
    .seo-demand-sources{font-size:.88rem;color:var(--color-muted)}
  `;
  document.head.append(style);
}
