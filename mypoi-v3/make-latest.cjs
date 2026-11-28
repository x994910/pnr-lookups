const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');

const [commit, version, output] = process.argv.slice(2);
if (!/^[a-f0-9]{40}$/.test(commit || '') || !/^\d+\.\d+\.\d+$/.test(version || '') || !output) {
  throw Error('Usage: node make-latest.cjs COMMIT VERSION OUTPUT');
}
const repo = execFileSync('git', ['rev-parse','--show-toplevel'], {cwd:__dirname, encoding:'utf8'}).trim();
const engine = 'pnr-engine-' + version + '.js';
const names = [engine,'nationalities.json','airports.json','profile-codes.txt','poi-notes.txt',
  'inter-cont.txt','email-subject.txt','interdiction-email.txt'];
const hashes = Object.fromEntries(names.map(name => {
  const bytes = execFileSync('git',['show', commit + ':mypoi-v3/' + name], {cwd:repo, maxBuffer:8*1024*1024});
  return [name,createHash('sha384').update(bytes).digest('base64')];
}));
const manifest={schema:1, api:1, minLoader:1, status:'approved', commit, version, engine, hashes};
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n', {flag:'wx'});
