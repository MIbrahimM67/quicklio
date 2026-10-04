import '/assets/js/opportunity-tools-discovery.mjs';
import '/assets/js/publisher-content.mjs';
import '/assets/js/site-base.mjs';

if(document.body.classList.contains('tool-page')){
  const flowStyle=document.createElement('link');
  flowStyle.rel='stylesheet';
  flowStyle.href='/assets/css/tool-flow.css';
  document.head.append(flowStyle);
  import('/assets/js/tool-flow.mjs').catch(error=>console.warn('Quicklio guided flow unavailable',error));
}
