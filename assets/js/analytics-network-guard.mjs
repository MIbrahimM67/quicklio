const productionHosts=new Set(['quicklio.app','www.quicklio.app']);

if(!productionHosts.has(location.hostname)){
  const nativeAppend=document.head.append.bind(document.head);
  document.head.append=(...nodes)=>{
    const filtered=nodes.filter(node=>{
      if(!(node instanceof HTMLScriptElement))return true;
      try{
        const src=new URL(node.src,location.href);
        return src.hostname!=='www.googletagmanager.com';
      }catch{
        return true;
      }
    });
    if(filtered.length)nativeAppend(...filtered);
  };
}
