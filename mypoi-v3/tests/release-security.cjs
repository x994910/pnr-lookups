const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const {generateKeyPairSync,sign,createHash,webcrypto} = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname,'../release-loader.js'),'utf8');
const pair = generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const other = generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const spki = pair.publicKey.export({type:'spki',format:'der'}).toString('base64');
const context = vm.createContext({crypto:webcrypto, TextDecoder, Uint8Array, atob, btoa,
  AbortSignal, fetch:async()=>new Response('expected')});
vm.runInContext(source,context);
const api = vm.runInContext('({verifyManifest,readVerifiedAsset,ASSETS})',context);
const now = Date.parse('2026-11-28T00:00:00Z');
const engine = 'pnr-engine-1.0.2.js';
const digest = createHash('sha384').update('expected').digest('base64');
const manifest = {schema:1, api:1, minLoader:1, status:'approved', commit:'a'.repeat(40), version:'1.0.2',
  engine, sequence:10, issued:'2026-11-27T00:00:00Z', expires:'2026-11-29T00:00:00Z',
  hashes:Object.fromEntries([engine,...api.ASSETS].map(name=>[name,digest]))};
function signed(m=manifest, key=pair.privateKey) {
  const bytes=Buffer.from(JSON.stringify(m));
  return {payload:bytes.toString('base64'),
    signature:sign('sha256',bytes,{key,dsaEncoding:'ieee-p1363'}).toString('base64')};
}
const check=(envelope=signed(), overrides={})=>api.verifyManifest(envelope,{spki,now,...overrides});

test('Accept valid signed metadata and reject sequence replay or reuse',async()=>{
  const accepted=await check();
  assert.equal(accepted.version,'1.0.2');
  assert.equal((await check(signed(),{previous:accepted})).sequence,10);
  await assert.rejects(check(signed({...manifest,sequence:9}),{previous:accepted}),/replay/);
  await assert.rejects(check(signed({...manifest,commit:'b'.repeat(40)}),{previous:accepted}),/sequence reuse/);
});
test('Approve a controlled rollback with a higher sequence',async()=>{
  const accepted=await check();
  const rollback={...manifest,version:'1.0.1',engine:'pnr-engine-1.0.1.js',sequence:11,rollback:true,
    hashes:{...manifest.hashes,'pnr-engine-1.0.1.js':digest}};
  assert.equal((await check(signed(rollback),{previous:accepted})).rollback,true);
});
test('Reject unsigned, modified, and unauthorised metadata or verification key',async()=>{
  const good=signed();
  await assert.rejects(check({...good,signature:''}),/signature/);
  await assert.rejects(check({...good,payload:signed({...manifest,commit:'b'.repeat(40)}).payload}),/signature/);
  await assert.rejects(check(signed(manifest,other.privateKey)),/signature/);
  const wrong=other.publicKey.export({type:'spki',format:'der'}).toString('base64');
  await assert.rejects(check(good,{spki:wrong}),/signature/);
});
test('Reject expired, future-dated and incompatible metadata',async()=>{
  await assert.rejects(check(signed(),{now:Date.parse(manifest.expires)}),/expired/);
  await assert.rejects(check(signed(),{now:Date.parse(manifest.issued)-1}),/dates/);
  await assert.rejects(check(signed({...manifest,api:2})),/incompatible/);
  await assert.rejects(check(signed({...manifest,minLoader:2})),/incompatible/);
  await assert.rejects(check(signed({...manifest,hashes:{}})),/asset hash/);
});
test('Reject modified engine/asset, missing asset and interrupted download',async()=>{
  const release=await check();
  assert.equal(await api.readVerifiedAsset(release,engine),'expected');
  context.fetch=async()=>new Response('modified');
  await assert.rejects(api.readVerifiedAsset(release,engine),/verification failed/);
  await assert.rejects(api.readVerifiedAsset(release,'airports.json'),/verification failed/);
  context.fetch=async()=>new Response(null,{status:404});
  await assert.rejects(api.readVerifiedAsset(release,'airports.json'),/404/);
  context.fetch=async()=>new Response(new ReadableStream({start(controller){controller.error(Error('interrupted'));}}));
  await assert.rejects(api.readVerifiedAsset(release,engine),/interrupted/);
  context.fetch=async()=>{throw Error('GitHub unavailable');};
  await assert.rejects(api.readVerifiedAsset(release,engine),/unavailable/);
});
test('Fail closed without a trust key or browser cryptography',async()=>{
  await assert.rejects(check(signed(),{spki:''}),/not been provisioned/);
  context.crypto=undefined;
  await assert.rejects(check(),/cryptography unavailable/);
});
