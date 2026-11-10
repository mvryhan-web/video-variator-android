// Robust speech draft accumulator and deduplicator.
// Resolves mobile Chrome / Android WebSpeech cumulative results, boundary word repeats,
// and double-firing events while preserving desktop continuous dictation.

function cleanText(t) {
  return String(t || '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(t) {
  return cleanText(t).replace(/[^\w\s\u0400-\u04FF]/gi, '').toLowerCase();
}

export function mergeSpeechPieces(pieces) {
  const merged = [];
  for (const raw of pieces) {
    const text = cleanText(raw);
    if (!text) continue;
    if (!merged.length) {
      merged.push(text);
      continue;
    }

    const last = merged[merged.length - 1];
    const lastNorm = normalizeKey(last);
    const currNorm = normalizeKey(text);

    // 1. Exact or normalized duplicate ('Привет' and 'Привет')
    if (currNorm === lastNorm) {
      if (text.length > last.length) merged[merged.length - 1] = text;
      continue;
    }

    // 2. Current text is a cumulative extension (Android Chrome bug: 'Привет' -> 'Привет как дела')
    if (currNorm.startsWith(lastNorm)) {
      merged[merged.length - 1] = text;
      continue;
    }

    // 3. Current text is an interim prefix of last text ('Привет как дела' -> 'Привет')
    if (lastNorm.startsWith(currNorm)) {
      continue;
    }

    // 4. Word-level boundary overlap ('Сегодня привет' + 'Привет как дела')
    const lastWords = last.split(' ');
    const currWords = text.split(' ');
    const lastWordsNorm = lastWords.map(normalizeKey);
    const currWordsNorm = currWords.map(normalizeKey);

    let overlapLen = 0;
    const maxK = Math.min(lastWords.length, currWords.length);
    for (let k = maxK; k > 0; k--) {
      const tail = lastWordsNorm.slice(-k).join(' ');
      const head = currWordsNorm.slice(0, k).join(' ');
      if (tail === head && tail.length > 0) {
        overlapLen = k;
        break;
      }
    }

    if (overlapLen > 0) {
      merged[merged.length - 1] = [...lastWords, ...currWords.slice(overlapLen)].join(' ');
    } else {
      merged.push(text);
    }
  }
  return merged.join(' ').trim();
}

export function createSpeechDraft(base = '') {
  const slots = new Map();
  const trimmedBase = cleanText(base);
  return event => {
    const results = event?.results || [];
    for (let i = 0; i < results.length; i++) {
      const str = String(results[i]?.[0]?.transcript || '').trim();
      if (str) slots.set(i, str);
    }
    for (const index of slots.keys()) {
      if (index >= results.length) slots.delete(index);
    }
    const pieces = [...slots.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(entry => entry[1])
      .filter(Boolean);

    const speechText = mergeSpeechPieces(pieces);
    if (!trimmedBase) return speechText;
    if (!speechText) return trimmedBase;
    return mergeSpeechPieces([trimmedBase, speechText]);
  };
}
