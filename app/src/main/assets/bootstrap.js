(() => {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.includes('@ffmpeg/ffmpeg@0.12.15/dist/umd/814.ffmpeg.js')) {
      const moduleWorker = 'import "https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/esm/worker.js";';
      return Promise.resolve(new Response(moduleWorker, { headers: { 'Content-Type': 'text/javascript' } }));
    }
    if (url.includes('@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js')) {
      return nativeFetch('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js', init);
    }
    return nativeFetch(input, init);
  };
})();
