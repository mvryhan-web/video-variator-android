// Only an uploaded, validated manifest can make a catalog phrase playable.
// Match information requests only; selecting a recording must never execute an action.
const answerRules = [
  [51, /коммерчес|commerc|comercial/u],
  [52, /промпт|prompt/u, /помо|состав|напис|help|write|aide|écri|ayud|escrib/u],
  [53, /фото|photo|image|imagen/u, /ожив|анимир|animate|animat|animer|animar/u],
  [54, /stripe/u, /безопас|оплат|платеж|pay|secur|paiement|pago|segur/u],
  [55, /кредит|credit|crédit|crédito/u, /куп|пополн|buy|purchase|top up|achet|recharg|compr|recarg/u],
  [56, /баланс|balance|solde|saldo/u],
  [57, /(?:^|\W)4\s?[kк](?=$|\W)/u, /разрешен|доступ|поддерж|можно|есть|resol|support|avail|dispon|possible|puedo/u],
  [58, /сколько.*(?:ждать|времени)|как долго|how long|render time|combien de temps|temps de (?:rendu|traitement)|cuánto (?:tarda|tiempo)/u],
  [59, /формат|format/u, /скач|download|télécharg|descarg/u],
  [61, /reels|youtube|ютуб/u, /формат|format|ratio|пропорц|horizontal|vertical/u],
  [64, /уникализатор|uniquifier|uniquificateur|unificador/u, /что|как работает|what|how.*work|qu.est|comment.*fonctionne|qué|cómo.*funciona/u],
  [67, /вдохновени|inspiration|inspiración/u, /что|зачем|what|qu.est|qué/u]
];
export function selectCatalogReply(entries, query, language) {
  const text = String(query).normalize('NFC').toLowerCase().replace(/ё/g, 'е').trim();
  if (!text || text.length > 500) return null;
  // A request to do something, a negation, or several topics needs normal routing.
  if (/(?:^|\s)(?:открой|открывай|не|нет|нельзя|open|launch|don't|not|no|ouvre|ouvrez|pas|abre|abrir)(?:\s|$)/u.test(text)) return null;
  const matches = answerRules.filter(([, ...tests]) => tests.every(test => test.test(text)));
  if (matches.length !== 1) return null;
  const id = 'jarvix_' + language + '_' + String(matches[0][0]).padStart(2, '0');
  return entries.find(item => item.language === language && item.id === id) || null;
}
export function createClipLibrary(fetchImpl = fetch) {
  let manifestPromise;
  const blobs = new Map();
  let bytes = 0;
  const maxBytes = 24 * 1024 * 1024;
  const normalize = text => String(text).normalize('NFC').trim().replace(/\s+/g, ' ');
  const prepare = () => manifestPromise ||= fetchImpl('/media/jarvix/clips/manifest.json', {signal:AbortSignal.timeout(2500)})
    .then(async response => {
      if (!response.ok) return [];
      const data = await response.json();
      if (!Array.isArray(data.clips)) return [];
      return data.clips.filter(item =>
        ['ru','en','fr','es'].includes(item.language) &&
        new RegExp('^jarvix_' + item.language + '_[0-9]{2}$').test(item.id) &&
        typeof item.text === 'string' &&
        new RegExp('^/media/jarvix/clips/' + item.id + '\\.(wav|mp3)(\\?v=[a-f0-9]{12})?$').test(item.url));
    }).catch(() => []);
  return {
    prepare,
    async preload(language) {
      const entries = await prepare();
      // Warm only common replies in the selected language, never the whole catalog.
      const ids = new Set([3, 7, 8, 21, 22, 24, 37, 76].map(n => `jarvix_${language}_${String(n).padStart(2, '0')}`));
      for (const item of entries.filter(item => item.language === language && ids.has(item.id))) {
        await this.get(item.text, language, AbortSignal.timeout(8000));
      }
    },
    async findReply(query, language) {
      return selectCatalogReply(await prepare(), query, language);
    },
    async get(text, language, signal) {
      const entries = await prepare();
      if (signal?.aborted) return null;
      const item = entries.find(item => item.language === language && normalize(item.text) === normalize(text));
      if (!item) return null;
      if (blobs.has(item.url)) {
        const blob = blobs.get(item.url);
        blobs.delete(item.url); blobs.set(item.url, blob);
        return blob;
      }
      try {
        const response = await fetchImpl(item.url, {signal});
        if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) return null;
        const blob = await response.blob();
        if (!blob.size || blob.size > 12 * 1024 * 1024 || signal?.aborted) return null;
        while (bytes + blob.size > maxBytes && blobs.size) {
          const key = blobs.keys().next().value;
          bytes -= blobs.get(key).size; blobs.delete(key);
        }
        if (!blobs.has(item.url)) { blobs.set(item.url, blob); bytes += blob.size; }
        return blob;
      } catch { return null; }
    }
  };
}
const library = createClipLibrary();
export const prepareStaticClips = library.prepare;
export const getStaticClip = library.get;
export const findCatalogReply = library.findReply;
export const preloadStaticClips = language => library.preload(language);

