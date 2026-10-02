const body=document.body;

if(body?.classList.contains('tool-page')){
  const explicitWorkbench=document.querySelector('.tool-workbench');
  const main=document.querySelector('main');
  const scope=explicitWorkbench||main;
  if(scope&&!document.querySelector('[data-tool-flow-guide]')){
    const path=location.pathname;
    const h1=document.querySelector('h1')?.textContent?.trim()||'this tool';
    const category=(path.split('/').filter(Boolean)[1]||'tool').toLowerCase();
    const noun=category==='images'?'image':category==='pdf'||category==='print'?'PDF':category==='social'?'image':category==='labels'?'label setup':'details';
    const fileInputs=[...scope.querySelectorAll('input[type="file"]')];
    const controls=[...scope.querySelectorAll('input:not([type="file"]):not([type="hidden"]),select,textarea')]
      .filter(el=>el.getAttribute('aria-hidden')!=='true'&&!el.closest('[hidden],[aria-hidden="true"]')&&el.getClientRects().length);
    const clickable=[...scope.querySelectorAll('button,a.button,[role="button"]')]
      .filter(el=>el.getAttribute('aria-hidden')!=='true'&&!el.closest('[hidden],[aria-hidden="true"]')&&el.getClientRects().length);
    const textOf=el=>(el?.textContent||el?.getAttribute?.('aria-label')||'').replace(/\s+/g,' ').trim();
    const isDownload=el=>/download|save|export|print/i.test(textOf(el))||el.hasAttribute?.('download');
    const isSecondary=el=>/reset|clear|remove file|choose another|back|undo|redo|cancel|delete selected/i.test(textOf(el));
    const downloadTargets=clickable.filter(isDownload);
    const uploadTrigger=fileInputs.length?clickable.find(el=>/^(?:open|choose|browse|upload|select)(?:\s+(?:a|an|the))?\s+(?:pdf|image|file|photo|logo)/i.test(textOf(el))):null;
    const actionTargets=clickable.filter(el=>el!==uploadTrigger&&!isDownload(el)&&!isSecondary(el)&&!/browse|upload|choose file|select file/i.test(textOf(el)));
    const primaryPattern=/\b(calculate|generate|convert|remove|analy[sz]e|create|apply|process|split|merge|compress|resize|make|build|check|run)\b/i;
    const primaryAction=actionTargets.find(el=>el.matches('[data-primary-action]'))
      ||actionTargets.find(el=>el.matches('.primary')&&primaryPattern.test(textOf(el)))
      ||actionTargets.find(el=>primaryPattern.test(textOf(el)))
      ||(!uploadTrigger&&actionTargets.length===1?actionTargets[0]:null);

    function cleanLabel(value){
      return(value||'').replace(/[:*]+$/,'').replace(/\s+/g,' ').trim();
    }
    function labelFor(el){
      if(el.id){
        const label=document.querySelector('label[for="'+CSS.escape(el.id)+'"]');
        if(label)return cleanLabel(label.childNodes[0]?.textContent||label.textContent);
      }
      const wrapping=el.closest('label');
      if(wrapping)return cleanLabel(wrapping.childNodes[0]?.textContent||wrapping.textContent);
      return cleanLabel(el.getAttribute('aria-label')||el.name||el.id||'Option');
    }
    function nearbyHelp(el){
      const parent=el.closest('.field,.form-field,.control,.color-control,.logo-control,.input-group,.setting,.settings-row,.row')||el.parentElement;
      if(!parent)return'';
      const help=[...parent.querySelectorAll('small,.hint,.help,.muted,.field-help')]
        .map(node=>(node.textContent||'').replace(/\s+/g,' ').trim())
        .find(Boolean);
      return help&&help.length<=180?help:'';
    }
    function fallbackHelp(el,label){
      const type=(el.getAttribute('type')||el.tagName).toLowerCase();
      if(type==='range')return'Move this slider to fine-tune '+label.toLowerCase()+'. You can change it again before downloading.';
      if(type==='color')return'Pick the color you want to use for '+label.toLowerCase()+'.';
      if(type==='checkbox')return'Turn this option on only when you want '+label.toLowerCase()+'.';
      if(type==='number')return'Enter the value you want to use for '+label.toLowerCase()+'.';
      if(el.tagName==='SELECT')return'Choose the option that best matches the result you want.';
      if(el.tagName==='TEXTAREA')return'Enter the text or values this tool should use.';
      return'Enter or adjust '+label.toLowerCase()+' for your result.';
    }
    function buttonHelp(label){
      const value=label.toLowerCase();
      if(/image.*signature|signature.*image/.test(value))return'Add an image or signature to the document, then position it where you need it.';
      if(/highlight/.test(value))return'Add a highlight annotation to draw attention to part of the page.';
      if(/rectangle|shape/.test(value))return'Add a shape annotation that you can place over the document or image.';
      if(/\bdraw\b|freehand/.test(value))return'Draw freehand marks or annotations directly on the working area.';
      if(/\btext\b/.test(value))return'Add editable text or a text annotation to the working area.';
      if(/rotate/.test(value))return'Rotate the currently selected page or item.';
      if(/delete|remove/.test(value))return'Remove the currently selected page, item, or annotation.';
      if(/crop/.test(value))return'Choose the area you want to keep and remove the surrounding area.';
      if(/preview/.test(value))return'Preview how the current settings will affect the final result.';
      return'Use this action when you want to '+label.toLowerCase()+'.';
    }

    const controlTips=[];
    const seenLabels=new Set();
    for(const control of controls){
      const label=labelFor(control);
      if(!label||seenLabels.has(label.toLowerCase())||/search/i.test(label))continue;
      seenLabels.add(label.toLowerCase());
      controlTips.push({label,help:nearbyHelp(control)||fallbackHelp(control,label)});
      if(controlTips.length>=7)break;
    }
    if(controlTips.length<7){
      for(const button of clickable){
        if(button===uploadTrigger||button===primaryAction||isDownload(button)||isSecondary(button))continue;
        const label=cleanLabel(textOf(button));
        if(!label||label.length>48||seenLabels.has(label.toLowerCase())||/review|support|privacy|next|previous/i.test(label))continue;
        seenLabels.add(label.toLowerCase());
        controlTips.push({label,help:buttonHelp(label)});
        if(controlTips.length>=7)break;
      }
    }

    const hasUpload=fileInputs.length>0;
    const hasSettings=controlTips.length>0;
    const separateSettings=hasUpload&&hasSettings;
    const actionLabel=textOf(primaryAction)||(/calculator/i.test(h1)?'Calculate':'Create result');
    const settingLabels=controlTips.slice(0,4).map(t=>t.label);
    const settingsDescription=settingLabels.length
      ?'Use '+settingLabels.join(', ')+(controlTips.length>4?', and the other available controls.':'.')+' Open the control guide below for a quick explanation of each setting or action.'
      :'Fine-tune the options for the result you want. Open the control guide below if an option is unclear.';
    const startDescription=hasUpload
      ?(uploadTrigger?'Choose “'+textOf(uploadTrigger)+'” and select the '+noun+' you want to work with.':'Choose the '+noun+' you want to work with. Nothing is changed until you run the tool.')
      :(hasSettings?'Enter or choose the values this tool needs. The control guide below explains the available inputs.':'Enter the main details this tool needs. You can revise them at any time.');
    const steps=[];
    steps.push({key:'start',title:hasUpload?'Add your '+noun:'Enter your details',description:startDescription});
    if(separateSettings)steps.push({key:'settings',title:'Choose your settings',description:settingsDescription});
    if(primaryAction)steps.push({key:'run',title:'Run the tool',description:'When the setup looks right, choose “'+actionLabel+'”. Quicklio will keep you on this page while it processes the result.'});
    steps.push({key:'result',title:'Review your result',description:downloadTargets.length?'Check the final result. If you want changes, adjust the settings and run it again; otherwise download or save it.':'Check the result. If it needs changes, adjust the inputs or actions above and try again.'});

    const guide=document.createElement('section');
    guide.className='tool-flow-guide shell';
    guide.dataset.toolFlowGuide='';
    guide.setAttribute('aria-label','How to use '+h1);
    guide.innerHTML='<div class="tool-flow-head"><div><span class="eyebrow">Simple guided flow</span><h2>Use '+h1+' in '+steps.length+' steps</h2><p data-tool-flow-status>Start with step 1. Quicklio will show what to do next.</p></div><span class="tool-flow-progress" data-tool-flow-progress>Step 1 of '+steps.length+'</span></div><ol class="tool-flow-steps">'+steps.map((step,index)=>'<li data-flow-step="'+step.key+'"><span class="tool-flow-number">'+(index+1)+'</span><div><strong>'+step.title+'</strong><p>'+step.description+'</p></div><span class="tool-flow-state" aria-hidden="true"></span></li>').join('')+'</ol>'+(controlTips.length?'<details class="tool-flow-tips"><summary>What do the controls do?</summary><dl>'+controlTips.map(t=>'<div><dt>'+t.label+'</dt><dd>'+t.help+'</dd></div>').join('')+'</dl></details>':'')+'<div class="tool-flow-result-note" data-tool-flow-result-note hidden><strong>Your result is ready.</strong><span> Review it below. Change any setting and run the tool again if you want to refine it, or download/save it when you are happy.</span></div>';

    if(explicitWorkbench)explicitWorkbench.before(guide);
    else{
      const hero=main?.querySelector('.tool-hero,.hero,[data-tool-hero]');
      if(hero)hero.after(guide);
      else main?.prepend(guide);
    }

    let interacted=false;
    let settingsTouched=false;
    let actionClicked=false;
    const status=guide.querySelector('[data-tool-flow-status]');
    const progress=guide.querySelector('[data-tool-flow-progress]');
    const resultNote=guide.querySelector('[data-tool-flow-result-note]');
    const stepEls=[...guide.querySelectorAll('[data-flow-step]')];

    function isVisible(el){
      if(!el||el.hidden||el.getAttribute('aria-hidden')==='true'||el.closest('[hidden],[aria-hidden="true"]'))return false;
      const style=getComputedStyle(el);
      return style.display!=='none'&&style.visibility!=='hidden'&&el.getClientRects().length>0;
    }
    function hasFile(){return fileInputs.some(input=>input.files&&input.files.length>0)}
    function enabledDownload(){return downloadTargets.find(el=>isVisible(el)&&!el.matches('[disabled],[aria-disabled="true"]'))}
    function meaningfulResult(){
      const candidates=[...scope.querySelectorAll('[data-result],[id*="result" i],[class*="result" i],[id*="output" i],[class*="output" i]')]
        .filter(el=>!el.closest('[data-tool-flow-guide]'));
      return candidates.find(el=>{
        if(!isVisible(el)||el.matches('.error,[role="alert"].error'))return false;
        const text=(el.textContent||'').replace(/\s+/g,' ').trim();
        return text.length>=3||Boolean(el.querySelector('canvas,img[src],svg,video,table'));
      });
    }
    function resultReady(){
      if(enabledDownload())return true;
      if(!interacted)return false;
      return Boolean(meaningfulResult()&&(actionClicked||!primaryAction));
    }
    function currentIndex(){
      if(resultReady())return steps.length-1;
      if(hasUpload&&!hasFile())return 0;
      if(!hasUpload&&!interacted)return 0;
      const settingsIndex=steps.findIndex(step=>step.key==='settings');
      if(settingsIndex>=0&&!settingsTouched)return settingsIndex;
      const runIndex=steps.findIndex(step=>step.key==='run');
      if(runIndex>=0)return runIndex;
      return steps.length-1;
    }
    function update(){
      const ready=resultReady();
      const current=currentIndex();
      stepEls.forEach((el,index)=>{
        el.classList.toggle('is-current',index===current&&!ready);
        el.classList.toggle('is-complete',ready||index<current);
        const state=el.querySelector('.tool-flow-state');
        if(state)state.textContent=(ready||index<current)?'✓':index===current?'Now':'';
      });
      resultNote.hidden=!ready;
      const autoProcessing=hasUpload&&hasFile()&&!ready&&!primaryAction&&!separateSettings;
      const actionProcessing=actionClicked&&!ready;
      if(autoProcessing||actionProcessing){
        progress.textContent='Processing';
        status.textContent='Working on it… keep this page open while Quicklio prepares the result.';
      }else if(ready){
        progress.textContent='Complete';
        status.textContent='Result ready — review it, refine the settings if needed, or download/save it.';
      }else{
        progress.textContent='Step '+(current+1)+' of '+steps.length;
        if(steps[current])status.textContent='Next: '+steps[current].title+'. '+steps[current].description;
      }
    }

    const markInput=event=>{
      if(guide.contains(event.target))return;
      interacted=true;
      if(!fileInputs.includes(event.target))settingsTouched=true;
      update();
    };
    scope.addEventListener('input',markInput,true);
    scope.addEventListener('change',markInput,true);
    scope.addEventListener('drop',event=>{
      if(guide.contains(event.target))return;
      interacted=true;
      setTimeout(update,0);
    },true);
    scope.addEventListener('click',event=>{
      if(guide.contains(event.target))return;
      const target=event.target instanceof Element?event.target.closest('button,[role="button"],input,select,textarea,label,canvas'):null;
      if(!target)return;
      if(target===primaryAction){
        if(primaryAction.matches('[disabled],[aria-disabled="true"]'))return;
        interacted=true;
        settingsTouched=true;
        actionClicked=true;
        update();
        return;
      }
      if(target===uploadTrigger||isDownload(target)||isSecondary(target))return;
      if(separateSettings){
        interacted=true;
        settingsTouched=true;
        update();
      }
    },true);
    const observer=new MutationObserver(mutations=>{
      if(mutations.every(mutation=>guide.contains(mutation.target)))return;
      update();
    });
    observer.observe(scope,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','disabled','aria-disabled','aria-hidden','class','src']});
    update();
  }
}
