  const unique = xs => [...new Set(xs)];
  const clean = x => String(x ?? '').trim();
  const upper = x => clean(x).toUpperCase();
  const pad = n => String(n).padStart(2, '0');
  function splitEscaped(text, separator, release = '?') {
    const out = []; let part = '';
    for (let i = 0; i < text.length; i++) {
      if (text[i] === release && i + 1 < text.length) { part += text[i] + text[++i]; }
      else if (text[i] === separator) { out.push(part); part = ''; }
      else part += text[i];
    }
    out.push(part); return out;
  }
  function tokenize(input) {
    let text = String(input).replace(/\r\n?/g, '\n').trim();
    let comp = ':', element = '+', release = '?', end = "'";
    if (text.startsWith('UNA') && text.length >= 9) {
      [comp, element, , release, , end] = text.slice(3, 9).split(''); text = text.slice(9);
    }
    // Typographic segment terminators appear in copied PDFs; never alter apostrophes inside names.
    text = text.replace(/’(?=\s*(?:[A-Z]{3}[+\n]|$))/g, end);
    const terminated = splitEscaped(text, end, release);
    const chunks = terminated.length > 1 ? terminated : text.split(/\n(?=[A-Z]{3}(?:\+|$))/);
    const unescape = s => {
      let out = ''; for (let i = 0; i < s.length; i++) {
        if (s[i] === release && i + 1 < s.length) i++; out += s[i];
      } return out.trim();
    };
    return chunks.map((chunk, index) => {
      const raw = chunk.trim();
      const fields = splitEscaped(raw.replace(/\n/g, ''), element, release);
      return {tag: upper(fields.shift()), c: fields.map(f => splitEscaped(f, comp, release).map(unescape)), raw, index,
        wrapped: /\S\n\S/.test(raw)};
    }).filter(s => /^[A-Z]{3}$/.test(s.tag));
  }
