import{execFileSync}from'node:child_process';
const host='quicklio.app';
const key='2f6a9c3d5e8b4a71b0c6d2e9f1457abc';
const after=process.env.AFTER||'HEAD';
let before=process.env.BEFORE||'';
if(!before||/^0+$/.test(before)){
  try{before=execFileSync('git',['rev-parse',after+'^'],{encoding:'utf8'}).trim()}catch{before=''}
}
const args=before?['diff','--name-status',before,after]:['show','--pretty=','--name-status',after];
const diff=execFileSync('git',args,{encoding:'utf8'});
const urls=new Set();
for(const line of diff.split(/\r?\n/)){
  if(!line.trim())continue;
  const parts=line.split(/\t+/);
  const status=parts[0]||'';
  const path=(status.startsWith('R')?parts[2]:parts[1])||'';
  const oldPath=status.startsWith('R')?parts[1]:'';
  for(const p of [path,oldPath]){
    if(!p||!(p==='index.html'||p.endsWith('/index.html')))continue;
    const pathname=p==='index.html'?'/':'/'+p.replace(/index\.html$/,'');
    urls.add('https://'+host+pathname);
  }
}
const urlList=[...urls].filter(u=>new URL(u).hostname===host);
if(!urlList.length){console.log('IndexNow: no changed HTML URLs to submit.');process.exit(0)}
const payload={host,key,keyLocation:'https://'+host+'/'+key+'.txt',urlList};
const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify(payload)});
console.log('IndexNow:',response.status,response.statusText,'URLs:',urlList.length);
console.log(urlList.join('\n'));
if(![200,202].includes(response.status)){
  const body=await response.text();
  console.error(body);
  process.exit(1);
}
