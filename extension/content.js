(() => {
  // Injection is idempotent: opening the popup repeatedly adds no listeners.
  if (globalThis.__scamSniffInstalled) return;
  globalThis.__scamSniffInstalled = true;
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'SCAMSNIFF_GET_TEXT') return;
    const selection = window.getSelection()?.toString().trim() || '';
    // innerText excludes display:none/script/style content. Do not collect form values.
    const text = selection || document.body?.innerText || '';
    const limit = 200_000;
    respond({ text: text.slice(0, limit), source: selection ? 'selection' : 'page', truncated: text.length > limit });
  });
})();
