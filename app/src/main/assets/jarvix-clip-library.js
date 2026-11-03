// Only an uploaded, validated manifest can make a catalog phrase playable.
export function createClipLibrary(fetchImpl = fetch) {
  let manifestPromise;
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
    async get(text, language, signal) {
      const entries = await prepare();
      if (signal?.aborted) return null;
      const item = entries.find(item => item.language === language && normalize(item.text) === normalize(text));
      if (!item) return null;
      try {
        const response = await fetchImpl(item.url, {signal});
        if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) return null;
        const blob = await response.blob();
        return blob.size > 0 && blob.size <= 12 * 1024 * 1024 ? blob : null;
      } catch { return null; }
    }
  };
}
const library = createClipLibrary();
export const prepareStaticClips = library.prepare;
export const getStaticClip = library.get;
