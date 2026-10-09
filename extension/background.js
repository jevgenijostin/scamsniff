import { analyze, summarizeFindings } from './engine/index.js';

const MENU_ID = 'scamsniff-check-selection';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Check selection for ScamSniff',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  // Preserve the clicked selection even if focus changes before the message arrives.
  let text = info.selectionText;
  try {
    const target = { tabId: tab.id, frameIds: [info.frameId ?? 0] };
    await chrome.scripting.executeScript({ target, files: ['content.js'] });
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCAMSNIFF_GET_TEXT' }, {
      frameId: info.frameId ?? 0,
    });
    if (typeof text !== 'string' && response?.source === 'selection') text = response.text;
  } catch {
    // Restricted pages/frames may reject injection; the click still supplies selected text.
  }

  const message = typeof text === 'string' && text.trim()
    ? summarizeFindings(analyze(text))
    : 'No selected text available. Select text and try again.';
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'ScamSniff selection check',
      message,
    });
  } catch (error) {
    console.error('ScamSniff could not show the notification:', error);
  }
});
