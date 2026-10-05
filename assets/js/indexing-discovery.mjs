const resources={
'/guides/cricut-svg-print-then-cut-preflight/':{title:'Cricut SVG & Print Then Cut preflight guide',desc:'Check vectors, text, clipping, image size, and layout before Design Space.'},
'/guides/pdf-print-preflight/':{title:'PDF print preflight guide',desc:'Understand bleed, trim, page boxes, binding, color, and effective resolution.'},
'/guides/transparent-image-background-color-removal/':{title:'Transparent image & color removal guide',desc:'Choose the right workflow for backgrounds, selected colors, signatures, and transparency cleanup.'},
'/guides/photo-to-cross-stitch-pattern/':{title:'Photo to cross-stitch pattern guide',desc:'Plan stitch count, color reduction, DMC matching, confetti, and finished size.'},
'/en/pdf/online-pdf-editor/':{title:'Online PDF Editor',desc:'Annotate, sign, draw, and organize PDF pages in your browser.'},
'/en/pdf/add-bleed-and-crop-marks/':{title:'Add Bleed & Crop Marks',desc:'Prepare artwork for trimming with configurable bleed and printer crop marks.'},
'/en/pdf/merge-pdf/':{title:'Merge PDF',desc:'Combine multiple PDF files into one document in the order you choose.'},
'/en/pdf/pdf-to-word/':{title:'PDF to Word Converter',desc:'Create an editable DOCX with scan detection and optional OCR.'},
'/en/pdf/pdf-page-box-editor/':{title:'PDF Page Box Editor',desc:'Inspect and edit TrimBox, BleedBox, CropBox, MediaBox, and ArtBox.'},
'/en/halloween/halloween-candy-calculator/':{title:'Halloween Candy Calculator',desc:'Estimate candy pieces, bags, buffer, and optional cost for trick-or-treat night.'},
'/en/halloween/pumpkin-stencil-maker/':{title:'Pumpkin Stencil Maker',desc:'Turn a photo into a printable pumpkin carving stencil.'}
};
const relatedByPath={
'/en/crafts/':['/guides/cricut-svg-print-then-cut-preflight/','/guides/photo-to-cross-stitch-pattern/'],
'/en/crafts/cricut-svg-file-checker/':['/guides/cricut-svg-print-then-cut-preflight/'],
'/en/crafts/cricut-print-then-cut-size-checker/':['/guides/cricut-svg-print-then-cut-preflight/'],
'/en/crafts/cricut-sticker-maker/':['/guides/cricut-svg-print-then-cut-preflight/'],
'/en/crafts/cross-stitch-pattern-maker/':['/guides/photo-to-cross-stitch-pattern/'],
'/en/images/':['/guides/transparent-image-background-color-removal/'],
'/en/images/remove-background-from-logo/':['/guides/transparent-image-background-color-removal/'],
'/en/images/remove-color-from-image/':['/guides/transparent-image-background-color-removal/'],
'/en/images/signature-background-remover/':['/guides/transparent-image-background-color-removal/'],
'/en/images/photo-to-line-drawing/':['/guides/photo-to-cross-stitch-pattern/'],
'/en/pdf/':['/guides/pdf-print-preflight/'],
'/en/pdf/add-binding-margin-to-pdf/':['/guides/pdf-print-preflight/','/en/pdf/add-bleed-and-crop-marks/','/en/pdf/pdf-page-box-editor/'],
'/en/pdf/pdf-booklet-signature-maker/':['/guides/pdf-print-preflight/','/en/pdf/add-bleed-and-crop-marks/','/en/pdf/pdf-page-box-editor/'],
'/en/pdf/pdf-color-space-checker/':['/guides/pdf-print-preflight/','/en/pdf/pdf-page-box-editor/'],
'/en/pdf/crop-pdf/':['/en/pdf/online-pdf-editor/','/en/pdf/pdf-page-box-editor/','/guides/pdf-print-preflight/'],
'/en/pdf/add-watermark-to-pdf/':['/en/pdf/online-pdf-editor/'],
'/en/pdf/add-page-numbers-to-pdf/':['/en/pdf/online-pdf-editor/'],
'/en/pdf/split-pdf/':['/en/pdf/merge-pdf/','/en/pdf/online-pdf-editor/'],
'/en/pdf/image-to-pdf/':['/en/pdf/merge-pdf/'],
'/en/pdf/pdf-to-jpg/':['/en/pdf/pdf-to-word/'],
'/en/print/split-image-for-printing/':['/en/pdf/add-bleed-and-crop-marks/'],
'/en/halloween/halloween-candy-calculator/':['/en/halloween/pumpkin-stencil-maker/'],
'/en/halloween/pumpkin-stencil-maker/':['/en/halloween/halloween-candy-calculator/']
};
const path=location.pathname;
const related=(relatedByPath[path]||[]).map(href=>({href,...resources[href]})).filter(item=>item.title);
if(related.length){
  const main=document.querySelector('main');
  if(main&&!main.querySelector('[data-indexing-discovery]')){
    const sec=document.createElement('section');
    sec.className='shell';
    sec.dataset.indexingDiscovery='';
    sec.innerHTML='<div class="section-heading"><div><p class="eyebrow">Related Quicklio resources</p><h2>Continue this workflow</h2></div></div><div class="tool-card-grid"></div>';
    const grid=sec.querySelector('.tool-card-grid');
    for(const item of related){
      const a=document.createElement('a');
      a.className='tool-card';
      a.href=item.href;
      a.innerHTML=`<span class="tool-card-copy"><h3>${item.title}</h3><p>${item.desc}</p></span><span class="tool-card-arrow" aria-hidden="true">→</span>`;
      grid.append(a);
    }
    main.append(sec);
  }
}
