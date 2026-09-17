(() => {
  const folderBtn = document.getElementById('folderBtn');
  const fileInput = document.getElementById('fileInput');
  const fileSummary = document.getElementById('fileSummary');

  folderBtn?.addEventListener('click', () => {
    if (!window.AndroidBridge?.pickFolder) {
      window.AndroidBridge?.toast?.('Выбор папки доступен в Android-приложении.');
      return;
    }
    window.AndroidBridge.pickFolder();
  });

  window.receiveNativeFolderFiles = async (items) => {
    try {
      folderBtn.disabled = true;
      fileSummary.textContent = `Загружаю видео из папки: ${items.length}…`;
      const dt = new DataTransfer();
      for (const item of items) {
        const response = await fetch(item.url);
        if (!response.ok) throw new Error(`Не удалось открыть ${item.name}`);
        const blob = await response.blob();
        dt.items.add(new File([blob], item.name, { type: item.type || blob.type || 'video/mp4' }));
      }
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {
      fileSummary.textContent = `Ошибка папки: ${e.message}`;
      window.AndroidBridge?.toast?.(`Ошибка папки: ${e.message}`);
    } finally {
      folderBtn.disabled = false;
    }
  };
})();
