import { analyze, visibleFindings } from './engine/index.js';
import { isValidLicense } from './engine/license.js';

const $ = (id) => document.getElementById(id);
let pro = false;
let lastScan = null;

function render() {
  $('tier').textContent = pro ? 'PRO' : 'FREE';
  $('results').replaceChildren();
  $('upsell').hidden = true;
  if (!lastScan) return;
  const findings = visibleFindings(lastScan.findings, pro);
  $('status').textContent = `${lastScan.source === 'selection' ? 'Selection' : 'Page'} checked. ${findings.length ? `${findings.length} red flag${findings.length === 1 ? '' : 's'} found.` : 'No red flags found in the enabled rules.'}${lastScan.truncated ? ' Only the first 200,000 characters were scanned.' : ''}`;
  $('upsell').hidden = pro || !findings.some((finding) => finding.tier === 'free');
  for (const severity of ['high', 'medium', 'low']) {
    const group = findings.filter((finding) => finding.severity === severity);
    if (!group.length) continue;
    const heading = document.createElement('h2');
    heading.textContent = `${severity} · ${group.length}`;
    $('results').append(heading);
    for (const finding of group) {
      const card = document.createElement('article');
      card.className = `finding ${severity}`;
      const reason = document.createElement('p');
      reason.className = 'reason';
      reason.textContent = finding.reason + (finding.tier === 'pro' ? ' · Pro' : '');
      const quote = document.createElement('blockquote');
      const mark = document.createElement('mark');
      mark.textContent = finding.snippet;
      quote.append(mark);
      card.append(reason, quote);
      $('results').append(card);
    }
  }
}

const ready = chrome.storage.local.get('licenseKey').then(({ licenseKey }) => {
  pro = isValidLicense(licenseKey);
  render();
}).catch(() => { $('license-status').textContent = 'Could not read the local license. Free rules are available.'; });

$('check').addEventListener('click', async () => {
  $('check').disabled = true;
  lastScan = null;
  render();
  $('status').textContent = 'Checking locally…';
  try {
    await ready;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    const capture = await chrome.tabs.sendMessage(tab.id, { type: 'SCAMSNIFF_GET_TEXT' }, { frameId: 0 });
    if (!capture || typeof capture.text !== 'string') throw new Error('No text response');
    if (!capture.text.trim()) {
      $('status').textContent = 'No visible text found. Try selecting text on a regular webpage.';
      return;
    }
    lastScan = { ...capture, findings: analyze(capture.text) };
    render();
  } catch {
    $('status').textContent = 'This page cannot be read. Try a regular website; browser settings, stores and built-in PDF viewers are restricted. Reload the tab if needed.';
  } finally {
    $('check').disabled = false;
  }
});

$('license-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  await ready;
  const key = $('key').value.trim().toUpperCase();
  if (!isValidLicense(key)) {
    $('license-status').textContent = 'Invalid demo key. Check its format and checksum.';
    return;
  }
  try {
    await chrome.storage.local.set({ licenseKey: key });
    pro = true;
    $('key').value = '';
    $('license-status').textContent = 'Pro rules unlocked locally.';
    render();
  } catch { $('license-status').textContent = 'Could not save the license. Please retry.'; }
});

$('remove').addEventListener('click', async () => {
  await ready;
  try {
    await chrome.storage.local.remove('licenseKey');
    pro = false;
    $('key').value = '';
    $('license-status').textContent = 'Key removed. Free rules are active.';
    render();
  } catch { $('license-status').textContent = 'Could not remove the license. Please retry.'; }
});

$('upsell').querySelector('a').addEventListener('click', () => {
  $('license').open = true;
  $('key').focus();
});
