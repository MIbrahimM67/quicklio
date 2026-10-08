import '/assets/js/opportunity-tools-discovery.mjs';
import '/assets/js/publisher-content.mjs';
import '/assets/js/indexing-discovery.mjs';
import '/assets/js/search-demand-support.mjs';
import '/assets/js/analytics-network-guard.mjs';
import '/assets/js/site-base.mjs';

if(document.body.classList.contains('tool-page')){
  import('/assets/js/tool-flow.mjs').catch(error=>console.warn('Quicklio guided flow unavailable',error));
}
