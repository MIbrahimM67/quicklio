const $=s=>document.querySelector(s),dpi=$('#dpi'),mode=$('#dpiMode'),width=$('#printWidth'),button=$('#processBtn'),status=$('#status'),meta=$('#fileMeta');
const MAX_PIXELS=24000000,MAX_SIDE=10000;
function sourceRatio(){const m=(meta?.textContent||'').match(/(\d+)\s*×\s*(\d+)px/);return m?Number(m[2])/Number(m[1]):1}
function planned(){const d=Number(dpi?.value||300),wIn=Number(width?.value||0),w=Math.max(1,Math.round(d*wIn)),h=Math.max(1,Math.round(w*sourceRatio()));return{w,h,pixels:w*h}}
function unsafe(){if(mode?.value!=='resample')return null;const p=planned();return(p.w>MAX_SIDE||p.h>MAX_SIDE||p.pixels>MAX_PIXELS)?p:null}
function refresh(){if(!button)return;const p=unsafe();button.disabled=Boolean(p);button.setAttribute('aria-disabled',p?'true':'false');if(p&&status){status.textContent=`That output would be ${p.w.toLocaleString()} × ${p.h.toLocaleString()}px, which is too large for safe in-browser processing. Reduce DPI or print width.`;status.className='op-status error'}}
for(const el of[dpi,mode,width])el?.addEventListener('input',refresh);
button?.addEventListener('click',event=>{const p=unsafe();if(!p)return;event.preventDefault();event.stopImmediatePropagation();refresh()},true);
document.querySelector('#fileInput')?.addEventListener('change',()=>setTimeout(refresh,0));
refresh();
