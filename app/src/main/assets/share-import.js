(() => {
  'use strict';
  let busy = false;
  async function importSharedVideos() {
    const bridge = window.AndroidBridge, ui = window.VideoVariatorUI;
    if (busy || !bridge?.getSharedVideos || !ui || window.VideoVariatorCore?.state.running) return;
    let metadata;
    try { metadata = JSON.parse(bridge.getSharedVideos()); } catch (_) { return; }
    if (!metadata.length) return;
    busy = true;
    const ru = (document.documentElement.lang || navigator.language).startsWith('ru');
    try {
      ui.toast(ru ? 'Открываем видео из галереи…' : 'Opening shared videos…');
      const files = [];
      for (const item of metadata) {
        const parts = [];
        let offset = 0;
        while (offset < item.size) {
          const encoded = bridge.readSharedVideo(item.id, offset);
          if (!encoded) throw new Error('Incomplete shared video');
          const binary = atob(encoded), bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
          if (offset + bytes.length > item.size) throw new Error('Invalid shared video');
          parts.push(bytes); offset += bytes.length;
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        files.push(new File(parts, item.name, {type: item.type}));
      }
      // A job may have started while the content chunks were being read.
      // Never replace its source selection or navigate away from its worker.
      if (window.VideoVariatorCore?.state.running) throw new Error('Processing is active');
      ui.showView('dashboard');
      ui.setFiles(files);
      document.getElementById('workspace')?.scrollIntoView({block: 'start'});
      ui.toast(ru ? 'Видео добавлено. Выберите режим и создайте варианты.' : 'Videos added. Choose a mode and create variations.');
    } catch (_) {
      ui.toast(ru ? 'Не удалось открыть видео. Выберите файл внутри приложения.' : 'Could not open the shared video. Select the file inside the app.');
    } finally {
      bridge.finishSharedVideoImport(); busy = false;
    }
  }
  window.addEventListener('vu-shared-videos', importSharedVideos);
  importSharedVideos();
})();
