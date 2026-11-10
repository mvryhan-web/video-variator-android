// Bulletproof speech draft accumulator and deduplicator
// Fully supports Desktop Chrome, Mobile Chrome/Android, and iOS Safari

function cleanStr(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function normWord(w) {
  return cleanStr(w).replace(/[^\w\u0400-\u04FF]/gi, '').toLowerCase();
}

export function mergeSpeech(existing, incoming) {
  const ex = cleanStr(existing);
  const inc = cleanStr(incoming);
  if (!ex) return inc;
  if (!inc) return ex;

  const exLower = ex.toLowerCase();
  const incLower = inc.toLowerCase();

  // 1. Exact match
  if (exLower === incLower) {
    return inc.length >= ex.length ? inc : ex;
  }

  // 2. Cumulative extension (e.g. Android WebSpeech: 'Привет' -> 'Привет как дела')
  if (incLower.startsWith(exLower)) {
    return inc;
  }

  // 3. Existing already contains incoming
  if (exLower.endsWith(incLower) || exLower.startsWith(incLower)) {
    return ex;
  }

  // 4. Word boundary overlap (e.g. 'Привет как' + 'как дела')
  const exWords = ex.split(' ');
  const incWords = inc.split(' ');
  const exNorm = exWords.map(normWord);
  const incNorm = incWords.map(normWord);

  const maxK = Math.min(exWords.length, incWords.length);
  for (let k = maxK; k > 0; k--) {
    const tail = exNorm.slice(-k).join(' ');
    const head = incNorm.slice(0, k).join(' ');
    if (tail === head && tail.length > 0) {
      return [...exWords, ...incWords.slice(k)].join(' ');
    }
  }

  return ex + ' ' + inc;
}

// Backward-compatible alias for any older callers
export const mergeSpeechPieces = (pieces) => {
  let res = '';
  for (const p of pieces || []) res = mergeSpeech(res, p);
  return res;
};

export function createSpeechDraft(base = '') {
  const initialBase = cleanStr(base);

  return event => {
    const results = event?.results;
    if (!results || !results.length) return initialBase;

    let turnText = '';
    for (let i = 0; i < results.length; i++) {
      const piece = String(results[i]?.[0]?.transcript || '').trim();
      if (piece) {
        turnText = mergeSpeech(turnText, piece);
      }
    }

    if (!turnText) return initialBase;
    if (!initialBase) return turnText;
    return mergeSpeech(initialBase, turnText);
  };
}
