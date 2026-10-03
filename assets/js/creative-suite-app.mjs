const tool=document.body.dataset.creativeTool||'';
const load=async(path,name,args)=>{const mod=await import(path);mod[name](...(args||[]))};
if(tool==='stencil-maker')load('/assets/js/creative-suite/mask-tool.mjs','initMaskImageTool');
else if(tool==='silhouette-maker')load('/assets/js/creative-suite/mask-tool.mjs','initMaskImageTool',[{silhouette:true}]);
else if(tool==='tattoo-stencil-maker')load('/assets/js/creative-suite/tattoo.mjs','initTattoo');
else if(tool==='signature-background-remover')load('/assets/js/creative-suite/signature.mjs','initSignature');
else if(tool==='image-dpi-changer')load('/assets/js/creative-suite/dpi.mjs','initDpi');
else if(tool==='letter-stencil-maker')load('/assets/js/creative-suite/letter.mjs','initLetterStencil');
else if(tool==='cross-stitch-pattern-maker')load('/assets/js/creative-suite/cross-stitch.mjs','initCrossStitch');
