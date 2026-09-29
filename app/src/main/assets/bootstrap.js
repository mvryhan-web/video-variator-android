// Native API base only. Styles and ordered scripts live in index.html so the
// browser fetches them together instead of painting several design generations.
(() => {
  try {
    const base=window.AndroidBridge?.getApiBase?.();
    if(base && String(base).startsWith('https://')) window.VV_API_BASE=String(base).replace(/\/$/,'');
  } catch (_) {}
})();
