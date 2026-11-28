const RELEASE_ROOT = 'https://raw.githubusercontent.com/x994910/pnr-lookups/';
const RELEASE_POINTER = RELEASE_ROOT + 'mypoi-v3-latest/mypoi-v3/engine-latest.json';
const LOADER_VERSION = 1;
const ENGINE_API = 1;
const ASSETS = ['nationalities.json','airports.json','profile-codes.txt','poi-notes.txt',
  'inter-cont.txt','email-subject.txt','interdiction-email.txt'];
const utf8 = new TextDecoder('utf-8', {fatal:true});
const toBase64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));

function validateManifest(m) {
  if (!globalThis.crypto?.subtle) throw Error('Browser cryptography unavailable.');
  if (m.status !== 'approved' || m.schema !== 1 ||
      !/^\d+\.\d+\.\d+$/.test(m.version) || !/^[a-f0-9]{40}$/.test(m.commit) ||
      m.engine !== 'pnr-engine-' + m.version + '.js') throw Error('Invalid GitHub release metadata.');
  if (m.api !== ENGINE_API || !Number.isSafeInteger(m.minLoader) ||
      m.minLoader < 1 || m.minLoader > LOADER_VERSION) throw Error('Engine incompatible.');
  for (const name of [m.engine, ...ASSETS]) {
    if (typeof m.hashes?.[name] !== 'string' || !/^[A-Za-z0-9+/]{64}$/.test(m.hashes[name])) {
      throw Error('Missing or invalid asset hash: ' + name);
    }
  }
  return m;
}

async function downloadBytes(url, maxBytes) {
  const response = await fetch(url, {cache:'no-store', credentials:'omit', redirect:'error',
    referrerPolicy:'no-referrer', signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('Release download failed (HTTP ' + response.status + ').');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw Error('Release download exceeds the size limit.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

async function readVerifiedAsset(release, name) {
  const bytes = await downloadBytes(RELEASE_ROOT + release.commit + '/mypoi-v3/' + name, 8 * 1024 * 1024);
  if (toBase64(await crypto.subtle.digest('SHA-384', bytes)) !== release.hashes[name]) {
    throw Error('Release file verification failed: ' + name);
  }
  return utf8.decode(bytes);
}

// This broker runs in an opaque-origin iframe. Only its blob worker executes the engine.
function sandboxBroker(workerEntry) {
  addEventListener('message', function init(event) {
    if (event.source !== parent || event.data?.type !== 'myPoiInit' || !event.ports[0]) return;
    removeEventListener('message', init);
    const channel = event.ports[0];
    const url = URL.createObjectURL(new Blob([event.data.source, '\n;(', workerEntry.toString(), ')();'],
      {type:'text/javascript'}));
    try {
      const worker = new Worker(url);
      worker.onmessage = e => channel.postMessage(e.data);
      worker.onerror = () => channel.postMessage({fatal:true});
      channel.onmessage = e => worker.postMessage(e.data);
    } catch {
      channel.postMessage({fatal:true});
    } finally {
      URL.revokeObjectURL(url);
    }
  });
}

function workerEntry() {
  const engine = globalThis.MyPOIEngine;
  if (!engine || !['parse','derive','pretty','dateParts','contacts','fillTemplate']
      .every(name => typeof engine[name] === 'function')) throw Error('Invalid engine API');
  addEventListener('message', ({data:{id, method, args}}) => {
    try {
      let result;
      if (method === 'analyse') {
        const [raw, context] = args;
        const parsed = engine.parse(raw);
        result = {warnings:parsed.warnings, bookings:parsed.bookings.map(book => ({
          id:book.id, locator:book.locators[0]?.locator,
          passengers:book.passengers.map(pax => ({
            id:pax.id, surname:pax.surname, given:engine.pretty(pax.given), ref:pax.ref,
            derived:engine.derive(book, pax, {...context, parseWarnings:parsed.warnings})
          }))
        }))};
      } else if (method === 'email') {
        const [templates, port, carrier, values] = args;
        const record = engine.contacts(templates.contacts)[port + '|' + carrier];
        if (!record?.to.length) result = null;
        else {
          const parts = engine.dateParts(values.dob, 'birth');
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          if (parts) values.dob = String(parts.d).padStart(2,'0') + '/' + months[parts.m-1] + '/' + parts.y;
          values.al = record.name || carrier;
          result = {to:record.to.join('; '), cc:record.cc.join('; '),
            subject:engine.fillTemplate(templates.subject, values), body:engine.fillTemplate(templates.body, values)};
        }
      } else throw Error('Unsupported operation');
      postMessage({id, result});
    } catch {
      postMessage({id, failed:true});
    }
  });
  postMessage({ready:true});
}

function openEngine(source) {
  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.srcdoc = '<meta http-equiv="Content-Security-Policy" content="' +
    "default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; connect-src 'none'; " +
    "form-action 'none'; base-uri 'none'" + '"><script>(' +
    sandboxBroker.toString() + ')(' + workerEntry.toString() + ');</scr' + 'ipt>';
  const {port1, port2} = new MessageChannel();
  const pending = new Map();
  let nextId = 0, closed = false;
  const close = () => {
    closed = true;
    frame.remove();
    port1.close();
    for (const reply of pending.values()) reply({failed:true});
    pending.clear();
  };
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => fail(), 10000);
    function fail() {
      clearTimeout(timeout);
      close();
      reject(Error('Engine isolation failed or was blocked by this browser.'));
    }
    port1.onmessage = ({data}) => {
      if (data?.fatal) { fail(); return; }
      if (data?.ready) {
        clearTimeout(timeout);
        resolve({close, call(method, ...args) {
          if (closed) return Promise.reject(Error('Engine stopped. Reopen MyPOI to retry.'));
          return new Promise((done, error) => {
            const id = ++nextId;
            const timer = setTimeout(() => close(), 10000);
            pending.set(id, reply => {
              clearTimeout(timer);
              if (reply.failed) error(Error('Isolated engine could not complete the operation.'));
              else done(reply.result);
            });
            try { port1.postMessage({id, method, args}); }
            catch { close(); }
          });
        }});
        return;
      }
      const reply = pending.get(data?.id);
      if (reply) { pending.delete(data.id); reply(data); }
    };
    frame.addEventListener('load', () => {
      frame.contentWindow.postMessage({type:'myPoiInit', source}, '*', [port2]);
    }, {once:true});
    document.body.append(frame);
  });
}

let activeRelease, releaseLoading;
function loadRelease() {
  if (activeRelease) return Promise.resolve(activeRelease);
  if (!releaseLoading) {
    $('engineStatus').textContent = 'Checking for updates';
    releaseLoading = (async () => {
      if (!globalThis.crypto?.subtle) throw Error('Browser cryptography unavailable.');
      const manifest = validateManifest(JSON.parse(utf8.decode(await downloadBytes(RELEASE_POINTER, 32768))));
      const names = [manifest.engine, ...ASSETS];
      const files = Object.fromEntries(await Promise.all(names.map(async name =>
        [name, await readVerifiedAsset(manifest, name)])));
      configureLookups(files);
      const engine = await openEngine(files[manifest.engine]);
      activeRelease = {manifest, engine, files};
      $('engineStatus').textContent = 'Engine ' + manifest.version + ' — Loaded from GitHub';
      return activeRelease;
    })().catch(error => {
      $('engineStatus').textContent = 'Engine unavailable: ' + error.message;
      throw error;
    }).finally(() => { releaseLoading = null; });
  }
  return releaseLoading;
}
