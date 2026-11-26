  const formatters=new Map();
  function zonedParts(ms,zone) {
    if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
    const o={};for(const p of formatters.get(zone).formatToParts(ms))if(p.type!=='literal')o[p.type]=+p.value;
    return {y:o.year,m:o.month,d:o.day,h:o.hour,min:o.minute};
  }
  function localInstant(date,hhmm,zone) {
    if(!date || !time(hhmm) || !zone)return {error:'Missing date, time or airport timezone.'};
    try {
      const target=Date.UTC(date.y,date.m-1,date.d,+hhmm.slice(0,2),+hhmm.slice(2));const candidates=[];
      for(const shift of [-48,-24,0,24,48]) {
        const sample=target+shift*3600000,p=zonedParts(sample,zone);
        const offset=Date.UTC(p.y,p.m-1,p.d,p.h,p.min)-sample,guess=target-offset,q=zonedParts(guess,zone);
        if(q.y===date.y&&q.m===date.m&&q.d===date.d&&q.h===+hhmm.slice(0,2)&&q.min===+hhmm.slice(2))candidates.push(guess);
      }
      const found=unique(candidates);return found.length===1?{ms:found[0]}:{error:found.length?'Ambiguous daylight-saving time.':'Nonexistent daylight-saving time.'};
    }catch(e){return {error:'Airport timezone is not supported by this browser.'};}
  }
  function toNZ(f,airports) {
    const r=localInstant(f.depDate,f.depTime,airports[f.dep]?.tz);if(r.error)return r;
    const p=zonedParts(r.ms,'Pacific/Auckland');return {date:`${pad(p.d)}/${pad(p.m)}/${p.y}`,time:pad(p.h)+pad(p.min)};
  }
  function route(book,airports,nzCodes) {
    const warnings=[],nz=new Set(nzCodes), seen=new Set();
    const flights=book.flights.filter(f=>{
      const k=[f.dep,f.arr,f.depDate?.key,f.depTime,f.carrier,f.flight].join('|');
      if(['XX','HX','UN','UC','NO'].includes(f.status)||seen.has(k))return false;seen.add(k);return true;
    }).map(f=>({...f,instant:localInstant(f.depDate,f.depTime,airports[f.dep]?.tz).ms}));
    // Sort only when EVERY instant is known. A mix of local times is not a valid chronology.
    if(flights.every(f=>Number.isFinite(f.instant)))flights.sort((a,b)=>a.instant-b.instant);
    else warnings.push('Some flight times cannot be ordered reliably; source order retained.');
    const i=flights.findIndex(f=>nz.has(f.arr)&&!nz.has(f.dep)),arrival=flights[i];
    if(!arrival)return {warnings:[...warnings,'No inbound New Zealand flight was identified.'],flights};
    const path=[arrival];for(let j=i-1;j>=0;j--){if(flights[j].arr!==path[0].dep)break;path.unshift(flights[j]);}
    if(i>0&&path.length===1)warnings.push('Itinerary is disconnected; check origin and transit ports.');
    const transits=path.slice(0,-1).map(f=>f.arr);if(transits.length>2)warnings.push('More than two transits: showing the final two.');
    const departure=toNZ(arrival,airports);if(departure.error)warnings.push('Departure NZ time left blank: '+departure.error);
    if(!arrival.arrDate || !arrival.arrTime)warnings.push('Arrival date or time is missing or invalid.');
    if(arrival.operatingCarrier&&arrival.operatingCarrier!==arrival.carrier)warnings.push('Codeshare: displayed flight uses the booked carrier; verify airline contact before sending.');
    return {arrival,departure,origin:path[0].dep,transits:transits.slice(-2),exit:flights.slice(i+1).find(f=>nz.has(f.dep)&&!nz.has(f.arr)),flights,warnings};
  }
  function baggage(book,pax,flight) {
    const tagged=book.bags.filter(b=>b.ownerRef&&b.ownerRef===pax.ref);
    let bags=tagged.length?tagged:book.passengers.length===1?book.bags:[];
    if(flight) {const scoped=bags.filter(b=>b.flightIndex===flight.index);bags=scoped.length?scoped:bags.filter(b=>b.flightIndex===undefined);}
    return unique(bags.map(b=>`${b.pieces===null?'':b.pieces+' bag'+(b.pieces===1?'':'s')}${b.weight===null?'':(b.pieces===null?'':', ')+b.weight+' '+(b.unit||'(unit unknown)')+' total'}${b.pool?' (pooled)':''}`)).join('; ');
  }
