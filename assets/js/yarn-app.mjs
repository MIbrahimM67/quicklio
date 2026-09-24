import{calculateYarnFromSwatch}from"/assets/js/yarn-core.mjs";
const $=s=>document.querySelector(s);
const presets={custom:null,baby:[36,36],throw:[50,60],scarf:[8,60],panel:[20,24]};
$("#preset").addEventListener("change",()=>{const p=presets[$("#preset").value];if(p){$("#projectWidth").value=p[0];$("#projectHeight").value=p[1];}render();});
["projectWidth","projectHeight","swatchWidth","swatchHeight","swatchYarn","buffer","ballLength","yarnUnit","dimensionUnit"].forEach(id=>{$("#"+id).addEventListener("input",render);$("#"+id).addEventListener("change",render)});
function fmt(v){return new Intl.NumberFormat("en-US",{maximumFractionDigits:1}).format(v);}
function render(){try{const r=calculateYarnFromSwatch({projectWidth:$("#projectWidth").value,projectHeight:$("#projectHeight").value,swatchWidth:$("#swatchWidth").value,swatchHeight:$("#swatchHeight").value,swatchYarn:$("#swatchYarn").value,bufferPercent:$("#buffer").value,ballLength:$("#ballLength").value,unit:$("#yarnUnit").value});$("#totalYarn").textContent=fmt(r.totalYarn)+" "+r.unit;$("#balls").textContent=r.balls;$("#purchased").textContent=fmt(r.purchasedYarn)+" "+r.unit;$("#spare").textContent=fmt(r.spareYarn)+" "+r.unit;$("#results").hidden=false;$("#status").textContent="Estimate updated from your swatch usage.";$("#status").className="notice";}catch(e){$("#results").hidden=true;$("#status").textContent=e.message;$("#status").className="notice error";}}
render();
