const $=selector=>document.querySelector(selector);
const input=$('#pdfInput');
const drop=$('#drop');
const status=$('#status');
const fileMeta=$('#fileMeta');
const results=$('#results');

// Temporarily quarantine this checker until source PDF color operations can be
// identified reliably. PDF renderers may normalize original CMYK operations to
// RGB, so presenting a definitive result would risk misleading users.
const robots=document.querySelector('meta[name="robots"]');
if(robots)robots.setAttribute('content','noindex,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');

if(input)input.disabled=true;
if(results)results.hidden=true;
if(drop){
  drop.setAttribute('aria-disabled','true');
  drop.removeAttribute('role');
  drop.removeAttribute('tabindex');
  drop.style.cursor='not-allowed';
  drop.innerHTML='<div><strong>Checker temporarily unavailable</strong><span>We found a case where PDF rendering can hide the file\'s original CMYK operations. The checker is disabled until the result can be made reliable.</span></div>';
}
if(fileMeta)fileMeta.textContent='No files are being accepted while color-space detection accuracy is being improved.';
if(status){
  status.textContent='Temporarily disabled to avoid giving an incorrect RGB/CMYK result.';
  status.classList.add('is-error');
}
