
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mypoi-edge-'));
const profile=path.join(temp,'profile');
const edge=spawn(process.env.MYPOI_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<160;i++){const value=await fn();if(value)return value;await sleep(100);}throw Error('Timed out');}
const sample="TIF+TESTER:I+ALICE MS:A:1'TIF+OTHER:I+BOB:A:2'SSR+DOCS:HK:1:NZ:::::/P/NZL/TEST0001/NZL/12JAN90/F/12JAN30/TESTER/ALICE+::1'RCI+NZ:DEMO01'TVL+161126:1800:171126:0900+SIN+AKL+NZ+281:Y'";

let signedRelease, files={}, browserTraffic=[];
const candidate=path.join(root,'mypoi-v3');
const {createHash}=require('node:crypto');
const http=require('node:http');
const candidatePath=path.join(temp,'latest-mypoi-browser-demo.html');
fs.copyFileSync(path.join(candidate,'MyPOI.html'),candidatePath);
const assetNames=['nationalities.json','airports.json','profile-codes.txt','poi-notes.txt','inter-cont.txt','email-subject.txt','interdiction-email.txt'];
for(const name of assetNames) files[name]=fs.readFileSync(path.join(candidate,name));
files['inter-cont.txt']=Buffer.from('SIN,NZ,Air New Zealand,sample@example.invalid,copy@example.invalid');
const server=http.createServer((req,res)=>{
  browserTraffic.push(req.url);
  res.setHeader('Access-Control-Allow-Origin','*');
  const item=req.url==='/engine-latest.json'?signedRelease:files[req.url.slice(1)];
  res.statusCode=item?200:404;res.end(item);
});
const buildPointer=(version,probe)=>{
  const engine='pnr-engine-'+version+'.js';
  files[engine]=fs.readFileSync(path.join(candidate,engine));
  if(probe){
    const url='http://127.0.0.1:'+server.address().port+'/probe';
    files[engine]=Buffer.concat([files[engine],Buffer.from(
      '\nlet probeResult; fetch('+JSON.stringify(url)+').then(()=>{probeResult="network unexpectedly available";},()=>{probeResult="probe: fetch blocked";});\n'+
      'const oldParse=globalThis.MyPOIEngine.parse; globalThis.MyPOIEngine.parse=(...args)=>{const p=oldParse(...args);p.warnings.push(probeResult||"probe pending",typeof document === "undefined" && typeof navigator.clipboard === "undefined" ? "probe: DOM and clipboard unavailable":"probe: unexpected access"); return p;};'
    )]);
  }
  const manifest={schema:1,api:1,minLoader:1,status:'approved',commit:'a'.repeat(40),version,engine,
    hashes:Object.fromEntries([engine,...assetNames].map(name=>[name,createHash('sha384').update(files[name]).digest('base64')]))};
  signedRelease=JSON.stringify(manifest);
};

async function main(){
await new Promise(r=>server.listen(0,"127.0.0.1",r));buildPointer("1.0.2",false);
const port=await until(()=>{try{return fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split(/\r?\n/)[0];}catch{return null;}});
const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
let id=0;const pending=new Map(), requests=[];
socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent')requests.push(m.params.request);const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
const ev=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
await cmd('Page.enable');await cmd('Network.enable');
await cmd('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
  const actual=window.fetch.bind(window);
  window.copied=[];window.engineCalls=0;window.rejectEngine=false;
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.copied.push(text)}});
  window.fetch=(url,options)=>{
    if(url.includes('/getusers'))return Promise.resolve(new Response(JSON.stringify([{Name:'Sam Example'}])));
    if(url.includes('/api/ports'))return Promise.resolve(new Response(JSON.stringify([{Code:'SIN',Name:'Singapore'},{Code:'AKL',Name:'Auckland'}])));
    if(location.href.includes('latest-mypoi-browser-demo') && url.startsWith('https://raw.githubusercontent.com/'))return actual('http://127.0.0.1:'+${server.address().port}+'/'+url.split('/').pop(),options);
    if(url.endsWith('inter-cont.txt'))return Promise.resolve(new Response('SIN,NZ,Air New Zealand,sample@example.invalid,copy@example.invalid'));
    if(url.includes('pnr-engine-')){window.engineCalls++;if(window.rejectEngine){const hash=options.integrity;options={...options,integrity:hash.slice(0,-1)+(hash.at(-1)==='A'?'B':'A')};}}
    return actual(url,options);
  };
})();`});

const outputs=[];
for(const version of [2,3]){
  await cmd('Page.navigate',{url:pathToFileURL(version===2?path.join(root,'mypoi-v2','MyPOI.html'):candidatePath).href});
  await until(()=>ev("location.href.includes('"+(version===2?'mypoi-v2':'latest-mypoi-browser-demo')+"') && !!document.getElementById('analyse')"));
  if(version===3) await until(()=>ev("document.getElementById('engineStatus').textContent.includes('1.0.2 — Loaded from GitHub')"));
  await ev("document.getElementById('raw').value="+JSON.stringify(sample));
  await ev("document.getElementById('analyse').click()");
  try{await until(()=>ev("document.getElementById('pdSurname').value==='TESTER'"));}catch(e){throw Error(await ev("document.getElementById('parseNotice').textContent"));}
  await ev("document.getElementById('tdOfficer').value='Sam';document.getElementById('tdOfficer').dispatchEvent(new Event('input'))");
  await until(()=>ev("document.getElementById('officerList').options.length===1"));
  await ev("document.getElementById('pdAms').value='123';document.getElementById('pdAms').dispatchEvent(new Event('input'));document.getElementById('poi').click()");
  await until(()=>ev('window.copied.length===1'));
  await ev("document.getElementById('interdiction').click()");
  try{await until(()=>ev("document.getElementById('emailStatus').textContent.includes('ready')"));}catch(e){throw Error(await ev("document.getElementById('poiStatus').textContent"));}
  for(const b of ['copyToBtn','copyCcBtn','copySubjectBtn','copyBodyBtn'])await ev('document.getElementById('+JSON.stringify(b)+').click()');
  const output=await ev("({copied:window.copied,fields:[...document.querySelectorAll('.field input,.field select')].map(e=>e.value)})");
  assert.equal(output.copied.length,5);
  assert.equal(output.copied[0].split('\n').indexOf(sample),29);
  outputs.push(output);
  await ev("document.querySelectorAll('#passengerList input')[1].click()");
  assert.equal(await ev("document.getElementById('pdGiven').value"),'Bob');
}
assert.deepEqual(outputs[0],outputs[1]);
await ev("document.querySelectorAll('#passengerList input')[0].click(); window.scrollTo(0,0);");
if (process.env.MYPOI_SCREENSHOT) {
  const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  fs.writeFileSync(process.env.MYPOI_SCREENSHOT,Buffer.from(shot.data,'base64'));
}
assert.equal(browserTraffic.filter(u=>u==='/engine-latest.json').length,1);
buildPointer('1.0.1',true);
await cmd('Page.reload',{ignoreCache:true});
await until(()=>ev("document.getElementById('engineStatus')?.textContent.includes('1.0.1 — Loaded from GitHub')"));
await ev("document.getElementById('raw').value="+JSON.stringify(sample)+";document.getElementById('analyse').click()");
await until(()=>ev("document.getElementById('parseNotice').textContent.includes('probe: fetch blocked')"));
assert.ok(await ev("document.getElementById('parseNotice').textContent.includes('probe: DOM and clipboard unavailable')"));
assert.ok(!browserTraffic.includes('/probe'));
buildPointer('1.0.2',false);
files['pnr-engine-1.0.2.js']=Buffer.from('modified');
await cmd('Page.reload',{ignoreCache:true});
await until(()=>ev("document.getElementById('engineStatus')?.textContent.includes('file verification failed')"));
assert.ok(requests.filter(r=>/^https?:/.test(r.url)).every(r=>r.method==='GET'&&!r.postData&&!r.url.includes('DEMO01')));
console.log('Edge file:// passed: GitHub manifest load, update after reopening, corrupt bundle rejection, worker fetch blocked, no DOM/clipboard, 29-field parity, passenger selection/manual edits and all five copy payloads.');
socket.close();

}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{
  edge.kill();
  server.closeAllConnections();
  server.close();
  edge.unref();
  setTimeout(()=>{try{fs.rmSync(temp,{recursive:true,force:true});}catch {} process.exit(process.exitCode || 0);},1000);
});
