  function csv(text,separator=',') {
    const rows=[];let row=[],value='',quoted=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
      else if(c===separator&&!quoted){row.push(value.trim());value='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value.trim());if(row.some(Boolean))rows.push(row);row=[];value='';}
      else value+=c;
    }row.push(value.trim());if(row.some(Boolean))rows.push(row);return rows;
  }
  function contacts(text) {
    const first=text.split(/\r?\n/).find(l=>l.trim()&&!/^\s*(#|\/\/)/.test(l))||'';
    const sep=first.includes('\t')?'\t':first.includes('|')?'|':',';
    const rows=csv(text,sep).filter(r=>!/^\s*(#|\/\/)/.test(r[0]));
    let idx=[0,1,2,3,4]; const h=(rows[0]||[]).map(x=>x.toLowerCase().replace(/[ _-]/g,''));
    if(h.includes('to')) {idx=[h.findIndex(x=>['interdictionport','port','airport'].includes(x)),h.findIndex(x=>['airlinecode','airline','carrier'].includes(x)),h.findIndex(x=>['airlinename','name'].includes(x)),h.indexOf('to'),h.indexOf('cc')];rows.shift();}
    const map={};for(const row of rows){const [port,airline,name,to,cc]=idx.map(i=>row[i]||'');if(!/^[A-Z]{3}$/.test(upper(port))||!/^[A-Z0-9]{2,3}$/.test(upper(airline)))continue;
      const emails=x=>unique(x.split(/[;,]/).map(clean).filter(Boolean));const key=upper(port)+'|'+upper(airline);
      const prev=map[key];map[key]={name:clean(name),to:unique([...(prev?.to||[]),...emails(to)]),cc:unique([...(prev?.cc||[]),...emails(cc)])};
    }return map;
  }
  function fillTemplate(text,values) {
    return text.replace(/\{\{([a-zA-Z]+)\}\}/g,(_,key)=>{if(!Object.hasOwn(values,key))throw Error('Unknown template field: '+key);return String(values[key]??'');});
  }
