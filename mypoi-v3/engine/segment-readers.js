  function dateParts(value, kind = 'travel', referenceYear = new Date().getFullYear()) {
    const s = upper(value); let d, m, y;
    if (/^\d{6}$/.test(s)) { d = +s.slice(0,2); m = +s.slice(2,4); y = +s.slice(4); }
    else if (/^\d{2}[A-Z]{3}(\d{2}|\d{4})$/.test(s)) {
      d = +s.slice(0,2); m = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(s.slice(2,5)) + 1; y = +s.slice(5);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { [d,m,y] = s.split('/').map(Number); }
    else return null;
    if (y < 100) { y += 2000; if (kind === 'birth' ? y > referenceYear : y > referenceYear + 49) y -= 100; }
    const ms = Date.UTC(y,m-1,d), dt = new Date(ms);
    if (y < 1900 || m < 1 || m > 12 || d < 1 || dt.getUTCMonth() !== m-1 || dt.getUTCDate() !== d) return null;
    return {y,m,d,key:`${y}-${pad(m)}-${pad(d)}`, display:`${pad(d)}/${pad(m)}/${y}`};
  }
  function time(value) { const s = clean(value); return /^([01]\d|2[0-3])[0-5]\d$/.test(s) ? s : ''; }
  function stripTitle(value, attached = false) {
    let s = clean(value).replace(/\s+/g,' ');
    s = s.replace(/(?:^|\s)(MR|MRS|MS|MISS|MSTR|MASTER|DR|PROF|SIR|MADAM)\.?$/i, '').trim();
    if (attached && /^[A-Z]+$/.test(s)) s = s.replace(/(MRS|MISS|MSTR|MR|MS)$/,'');
    return s;
  }
  const nameKey = p => upper(p.surname) + '|' + upper(p.given).replace(/[^\p{L}\p{N}]/gu,'');
  const sameName = (a,b) => nameKey(a) === nameKey(b);
  function readTIF(s) {
    if (s.c[0]?.[1] === 'G') return [];
    return s.c.slice(1).filter(c => c[0]).map(c => ({surname:s.c[0]?.[0] || '', given:[stripTitle(c[0], true), clean(c[4]), clean(c[5])].filter(Boolean).join(' '), ref:c[2] || '', type:c[1] || '', docs:[], warnings:[], index:s.index}));
  }
  function readDOCS(s, year) {
    if (s.c[0]?.[0] !== 'DOCS') return null;
    const text = (s.c[0].slice(8).join(':') || '').trim();
    const start = text.indexOf('/'); if (start < 0) return null;
    const p = text.slice(start+1).split('/'); if (p.length < 7) return null;
    const birth = dateParts(p[4], 'birth', year);
    return {docType:upper(p[0]), issuing:upper(p[1]), docNo:clean(p[2]), nationality:upper(p[3]),
      dob:birth?.display || '', sex:upper(p[5]), expiry:dateParts(p[6], 'travel', year)?.display || '',
      surname:clean(p[7]), given:stripTitle(p.slice(8).filter(Boolean).filter(x=>x!=='H').join(' ')),
      refs:unique(s.c.slice(1).map(c=>c[2]).filter(Boolean)), index:s.index,
      warnings:p[4] && !birth ? ['Unrecognised birth date; enter it manually.'] : []};
  }
  function readTVL(s, year) {
    const dt = s.c[0] || [], carrier = s.c[3] || [], product = s.c[4] || [];
    const dep = upper(s.c[1]?.[0]), arr = upper(s.c[2]?.[0]);
    if (!dep || !arr || !carrier[0] || !/^\d+[A-Z]?$/.test(product[0] || '')) return null;
    return {dep,arr, carrier:upper(carrier[0]), operatingCarrier:upper(carrier[1]), flight:product[0],
      depDate:dateParts(dt[0], 'travel', year), depTime:time(dt[1]), arrDate:dateParts(dt[2], 'travel', year), arrTime:time(dt[3]),
      dateVariation:dt[4] || '', index:s.index, status:'', operatingFlight:'', warnings:[]};
  }
  function readRCI(s, year) {
    return s.c.filter(c=>c[0] && c[1]).map(c=>({system:c[0],locator:c[1],type:c[2] || '',date:dateParts(c[3], 'travel',year)?.display || ''}));
  }
  function readTBD(s) {
    const c = s.c[1] || []; if (!c[0] && !c[1]) return null;
    const unit = c[2] === '700' || upper(c[3]) === 'KGM' ? 'kg' : c[2] === '701' || upper(c[3]) === 'LBR' ? 'lb' : '';
    return {pieces:/^\d+$/.test(c[0] || '') ? +c[0] : null, weight:/^\d+(\.\d+)?$/.test(c[1] || '') ? +c[1] : null,
      unit, pool:s.c[3]?.[0] || '', index:s.index};
  }
  function readAgency(s) {
    if (s.tag === 'IFT') return clean(s.c.slice(1).flat().join(' ')).replace(/^TA\s+/i,'');
    if (s.tag === 'ADD' && s.c[1]?.[0] === 'AM') return s.c[1][1] || '';
    if (s.tag === 'LTS') return s.raw.match(/\/7\/RM TA\s+(.+)$/)?.[1] || '';
    return '';
  }
