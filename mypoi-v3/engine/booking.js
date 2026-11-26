  const newBooking = id => ({id,passengers:[],docs:[],flights:[],locators:[],bags:[],warnings:[],agency:'',bookingDate:'',seats:[],payments:[],amounts:[]});
  function parse(input, year = new Date().getFullYear()) {
    const segments = tokenize(input), bookings = []; let b = newBooking(0), currentPax = null, currentFlight = null;
    let hasSRC = segments.some(s=>s.tag==='SRC'), started = !hasSRC, history = false, headers = [];
    const finish = () => { if (b.passengers.length || b.docs.length || b.flights.length || b.locators.length) bookings.push(b); };
    for (const s of segments) {
      if (s.tag === 'SRC') { finish(); b = newBooking(bookings.length); currentPax=null;currentFlight=null;started=true;history=false;continue; }
      if (s.tag === 'UNH') { history=false; continue; }
      if (!started) { if(s.tag==='TVL') {const f=readTVL(s,year);if(f)headers.push(f);} continue; }
      if (s.tag === 'SAC') { history=true; b.warnings.push('Historical records were excluded from current fields.'); }
      if (history) continue;
      if (s.wrapped) b.warnings.push('Wrapped source lines were joined; check names against the original PNR.');
      switch(s.tag) {
        case 'TIF': {
          const names=readTIF(s); for(const p of names) {
            let existing=p.ref ? b.passengers.find(q=>q.ref===p.ref) : null;
            if(!existing && currentFlight) existing=b.passengers.find(q=>sameName(p,q));
            if(!existing) {existing=p;b.passengers.push(p);} currentPax=existing;
          } break;
        }
        case 'SSR': {
          const d=readDOCS(s,year);if(d){d.ownerRef=!currentFlight ? currentPax?.ref || '' : '';b.docs.push(d);}
          if(['SEAT','RQST'].includes(s.c[0]?.[0])) b.seats.push({seat:s.c[1]?.[0] || '', ref:s.c[1]?.[2] || ''}); break;
        }
        case 'TVL': {
          const f=readTVL(s,year); if(f){b.flights.push(f);currentFlight=f;currentPax=null;}
          else if(currentFlight && !s.c[1]?.[0] && !s.c[2]?.[0] && s.c[4]?.[0]) currentFlight.operatingFlight=s.c[4][0];
          else b.warnings.push('An open, non-air or incomplete travel segment needs manual review.'); break;
        }
        case 'TRA': if(currentFlight){currentFlight.operatingCarrier=s.c[0]?.[0] || '';currentFlight.operatingFlight=s.c[1]?.[0] || '';}break;
        case 'RPI': if(currentFlight)currentFlight.status=s.c[1]?.[0] || '';break;
        case 'RCI': {
          const rs=readRCI(s,year);if(!b.locators.length){b.locators=rs;b.bookingDate=rs.find(r=>r.date)?.date || '';}
          break;
        }
        case 'TBD': {const bag=readTBD(s);if(bag){bag.ownerRef=currentPax?.ref || '';bag.flightIndex=currentFlight?.index;b.bags.push(bag);}break;}
        case 'IFT': if((s.c[1]?.[0] || '').startsWith('TA ')) b.agency=readAgency(s);break;
        case 'ADD': case 'LTS': if(!b.agency)b.agency=readAgency(s);break;
        case 'SSD': b.seats.push({seat:s.c[0]?.[0] || '',ref:currentPax?.ref || ''});break;
        case 'FOP': b.payments.push(s.c);break;
        case 'MON': b.amounts.push(s.c);break;
      }
    }
    finish();
    for (const book of bookings) {
      // Associate explicitly by reference first, then exact normalised name. Never fuzzy-match identities.
      for(const d of book.docs) {
        let candidates=d.refs.length ? book.passengers.filter(p=>d.refs.includes(p.ref)) : book.passengers.filter(p=>sameName(p,d));
        if(!candidates.length && d.ownerRef) candidates=book.passengers.filter(p=>{
          const given=upper(p.given).replace(/\s/g,''),documentGiven=upper(d.given).replace(/\s/g,'');
          const infant=['MI','FI'].includes(d.sex),passengerInfant=p.type==='IN';
          return p.ref===d.ownerRef && upper(p.surname)===upper(d.surname) && given.length>=3 && documentGiven.startsWith(given) && infant===passengerInfant;
        });
        if(candidates.length===1) candidates[0].docs.push(d);
        else if(!candidates.length && (d.surname || d.given)) {
          const p={surname:d.surname,given:d.given,ref:d.refs[0] || '',type:'',docs:[d],warnings:[],index:d.index};book.passengers.push(p);
        } else book.warnings.push('A document could not be linked to one passenger; verify it manually.');
      }
      for (const p of book.passengers) {
        const ds=[...new Map(p.docs.map(d=>[JSON.stringify([d.docNo,d.nationality,d.dob,d.sex,d.surname,d.given]),d])).values()];
        const passports=ds.filter(d=>d.docType==='P' && d.docNo);
        const chosen=passports.length===1 ? passports[0] : passports.length>1 ? null : ds[0];
        p.details=chosen || {};if(passports.length>1)p.warnings.push('Multiple passport records: enter the correct document details manually.');
        if(chosen?.surname)p.surname=chosen.surname;if(chosen?.given)p.given=chosen.given;
        p.warnings.push(...(chosen?.warnings || []));
      }
      if(!book.flights.length && headers.length===1) {book.flights=[headers[0]];book.warnings.push('Only the message flight is available; full itinerary is missing.');}
      book.warnings=unique(book.warnings);
      book.passengers.forEach((p,i)=>p.id=`${book.id}:${i}`);
    }
    return {bookings,segmentCount:segments.length,warnings:bookings.length>1?['Multiple bookings: fields follow the selected passenger’s booking.']:[]};
  }
  // Convert local wall-clock to an instant by verifying candidate offsets. Ambiguous / impossible times fail explicitly.
