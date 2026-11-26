  const flightNo=f=>f?f.carrier+(/^\d+$/.test(f.flight)?f.flight.padStart(3,'0'):f.flight):'';
  const pretty=s=>String(s||'').split(' ').map(w=>w?w[0].toUpperCase()+w.slice(1).toLowerCase():'').join(' ');
  function derive(book,pax,{nat,air,ports,parseWarnings}){
    const port=code=>code ? code+(ports[code]?' '+ports[code]:'') : '';
    const trip=route(book,air.airports,air.nzCodes),f=trip.arrival,d=pax.details;
    const nationalityName=nat.codes[d.nationality]||'',mappedNationality=nat.aliases[nationalityName]||nationalityName;
    const fields={pdSurname:pax.surname.toUpperCase(),pdGiven:pretty(pax.given),pdGender:['M','MI'].includes(d.sex)?'Male':['F','FI'].includes(d.sex)?'Female':'',pdDob:d.dob||'',pdPassport:d.docType==='P'?d.docNo||'':'',pdNationality:nat.options.includes(mappedNationality)?mappedNationality:'',tdPnrNumber:book.locators[0]?.locator||'',bdBookingDate:book.bookingDate,bdTravelAgency:book.agency,bdBaggageWeight:baggage(book,pax,f)};
    if(f)Object.assign(fields,{pdInterdiction:port(f.dep),tdFlightNumber:flightNo(f),tdOriginPort:port(trip.origin),tdTransit1:port(trip.transits[0]),tdTransit2:port(trip.transits[1]),tdArrivalPort:port(f.arr),tdArrivalDate:f.arrDate?.display||'',tdArrHour:f.arrTime.slice(0,2),tdArrMin:f.arrTime.slice(2),tdDepartureDate:trip.departure.date||'',tdDepHour:trip.departure.time?.slice(0,2)||'',tdDepMin:trip.departure.time?.slice(2)||'',bdReturnDate:trip.exit?.depDate?.display||''});
    const warnings=[...parseWarnings,...book.warnings,...pax.warnings,...trip.warnings];
    if(d.nationality&&!fields.pdNationality)warnings.push('Nationality code is not mapped; select it manually.');
    if(book.bags.length&&!fields.bdBaggageWeight)warnings.push('Baggage could not be assigned to this passenger; check it manually.');
    if(!Object.keys(ports).length)warnings.push('Airport names are unavailable; airport codes are shown.');
    return {fields,warnings:[...new Set(warnings)]};
  }
