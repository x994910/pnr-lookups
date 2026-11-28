const fs = require('node:fs');
const {createPublicKey} = require('node:crypto');
const path = require('node:path');
const [keyFile, floorText, output] = process.argv.slice(2);
const floor = Number(floorText);
if (!keyFile || !output || !Number.isSafeInteger(floor) || floor < 1) {
  throw Error('Usage: node provision-loader.cjs PUBLIC_KEY_PEM MIN_SEQUENCE OUTPUT');
}
const pem = fs.readFileSync(keyFile,'utf8');
if (!pem.includes('-----BEGIN PUBLIC KEY-----')) throw Error('Only a public SPKI key is accepted.');
const key = createPublicKey(pem);
if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails.namedCurve !== 'prime256v1') {
  throw Error('Expected a P-256 public key.');
}
const spki = key.export({type:'spki',format:'der'}).toString('base64');
const html = fs.readFileSync(path.join(__dirname,'MyPOI.html'),'utf8');
const candidate = html.replace("const TRUSTED_SPKI = '';", "const TRUSTED_SPKI = '" + spki + "';")
  .replace('const MIN_SEQUENCE = 1;', 'const MIN_SEQUENCE = ' + floor + ';');
if (candidate === html) throw Error('Expected the unprovisioned loader template.');
fs.writeFileSync(output,candidate,{flag:'wx'});
