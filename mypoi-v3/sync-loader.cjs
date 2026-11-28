const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname,name),'utf8').replace(/\r\n/g,'\n');
const html = read('MyPOI.html');
const slot = /\/\/ BEGIN RELEASE LOADER\n[\s\S]*?\n\/\/ END RELEASE LOADER/;
if (!slot.test(html)) throw Error('HTML loader slot missing.');
const updated = html.replace(slot, () => '// BEGIN RELEASE LOADER\n' + read('release-loader.js').trim() + '\n// END RELEASE LOADER');
if (process.argv.includes('--check')) {
  if (updated !== html) throw Error('HTML loader does not match its source.');
} else fs.writeFileSync(path.join(__dirname,'MyPOI.html'),updated);
