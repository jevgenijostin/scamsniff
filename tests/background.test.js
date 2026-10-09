import { beforeEach, afterEach, expect, it, vi } from 'vitest';

let onClick;
let onInstall;

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('chrome', {
    runtime: {
      onInstalled: { addListener: vi.fn((listener) => { onInstall = listener; }) },
      getURL: (path) => `chrome-extension://test/${path}`,
    },
    contextMenus: {
      create: vi.fn(),
      onClicked: { addListener: vi.fn((listener) => { onClick = listener; }) },
    },
    scripting: { executeScript: vi.fn().mockResolvedValue([]) },
    tabs: { sendMessage: vi.fn().mockResolvedValue({ source: 'page', text: 'Act now' }) },
    notifications: { create: vi.fn().mockResolvedValue('notification') },
  });
  await import('../extension/background.js');
});

afterEach(() => vi.unstubAllGlobals());

it('registers the selection-only menu on install', () => {
  onInstall();
  expect(chrome.contextMenus.create).toHaveBeenCalledWith({
    id: 'scamsniff-check-selection', title: 'Check selection for ScamSniff', contexts: ['selection'],
  });
});

it('injects before messaging the clicked frame and analyzes only the clicked selection', async () => {
  chrome.tabs.sendMessage.mockImplementation(async () => {
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7, frameIds: [2] }, files: ['content.js'],
    });
    return { source: 'page', text: 'Act now' };
  });
  await onClick({ menuItemId: 'scamsniff-check-selection', selectionText: 'A pleasant day.', frameId: 2 }, { id: 7 });
  expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(7, { type: 'SCAMSNIFF_GET_TEXT' }, { frameId: 2 });
  expect(chrome.notifications.create).toHaveBeenCalledWith(expect.objectContaining({
    message: 'No red flags found in this selection.',
  }));
});

it('uses the clicked selection when injection is restricted', async () => {
  chrome.scripting.executeScript.mockRejectedValue(new Error('Restricted page'));
  await onClick({ menuItemId: 'scamsniff-check-selection', selectionText: 'Act now' }, { id: 7 });
  expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  expect(chrome.notifications.create).toHaveBeenCalledWith(expect.objectContaining({ message: '1 red flag found: urgency' }));
});

it('never analyzes a whole-page fallback when selected text is unavailable', async () => {
  await onClick({ menuItemId: 'scamsniff-check-selection' }, { id: 7 });
  expect(chrome.notifications.create).toHaveBeenCalledWith(expect.objectContaining({
    message: 'No selected text available. Select text and try again.',
  }));
});

it('ignores other menu items', async () => {
  await onClick({ menuItemId: 'other' }, { id: 7 });
  expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  expect(chrome.notifications.create).not.toHaveBeenCalled();
});
