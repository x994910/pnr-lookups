const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {createHash, createPrivateKey, sign} = require('node:crypto');
const path = require('node:path');

const [commit, version, sequenceText, expires, output, rollback] = process.argv.slice(2);
const keyPath = process.env.MYPOI_SIGNING_KEY_FILE;
const sequence = Number(sequenceText);
const now = Date.now();
if (!/^[a-f0-9]{40}$/.test(commit || '') || !/^\d+\.\d+\.\d+$/.test(version || '') ||
    !Number.isSafeInteger(sequence) || sequence < 1 || !output || !keyPath ||
    !(Date.parse(expires) > now && Date.parse(expires) <= now + 7 * 86400000) ||
    (rollback && rollback !== '--rollback')) {
  throw Error('Set MYPOI_SIGNING_KEY_FILE. Usage: node sign-release.cjs COMMIT VERSION SEQUENCE EXPIRES_UTC OUTPUT [--rollback]');
}
const repo = execFileSync('git', ['rev-parse','--show-toplevel'], {cwd:__dirname, encoding:'utf8'}).trim();
const relativeKey = path.relative(repo, fs.realpathSync(keyPath));
if (!relativeKey.startsWith('..' + path.sep) && !path.isAbsolute(relativeKey)) {
  throw Error('Use a signing key stored outside the repository.');
}
const key = createPrivateKey(fs.readFileSync(keyPath));
if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails.namedCurve !== 'prime256v1') {
  throw Error('Expected an approved P-256 signing key.');
}
const engine = 'pnr-engine-' + version + '.js';
const names = [engine,'nationalities.json','airports.json','profile-codes.txt','poi-notes.txt',
  'inter-cont.txt','email-subject.txt','interdiction-email.txt'];
const hashes = Object.fromEntries(names.map(name => {
  const bytes = execFileSync('git',['show', commit + ':mypoi-v3/' + name], {cwd:repo, maxBuffer:8*1024*1024});
  return [name,createHash('sha384').update(bytes).digest('base64')];
}));
const payload = Buffer.from(JSON.stringify({schema:1, api:1, minLoader:1, status:'approved',
  commit, version, engine, sequence, issued:new Date(now).toISOString(), expires,
  rollback:rollback === '--rollback', hashes}));
const signature = sign('sha256', payload, {key, dsaEncoding:'ieee-p1363'});
fs.writeFileSync(output, JSON.stringify({payload:payload.toString('base64'),
  signature:signature.toString('base64')}, null, 2) + '\n', {flag:'wx'});
