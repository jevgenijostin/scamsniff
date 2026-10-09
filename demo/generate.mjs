import { readFile, writeFile } from 'node:fs/promises';
import { analyze, visibleFindings } from '../extension/engine/index.js';

const sampleText = 'Hallo, Ihr Paket wartet auf die Zustellung. Jetzt handeln: Visit https://paypaI.com to pay the delivery fee via gift card within 24 hours, sonst wird das Paket zurückgeschickt.';
const findings = analyze(sampleText);
const displayedFindings = visibleFindings(findings, false);

// Match popup.js render() wording and grouping; escape text like textContent does.
const escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const lastScan = { source: 'selection', truncated: false };
const status = `${lastScan.source === 'selection' ? 'Selection' : 'Page'} checked. ${displayedFindings.length ? `${displayedFindings.length} red flag${displayedFindings.length === 1 ? '' : 's'} found.` : 'No red flags found in the enabled rules.'}${lastScan.truncated ? ' Only the first 200,000 characters were scanned.' : ''}`;
const cards = [];
for (const severity of ['high', 'medium', 'low']) {
  const group = displayedFindings.filter((finding) => finding.severity === severity);
  if (!group.length) continue;
  cards.push(`<h2>${severity} · ${group.length}</h2>`);
  for (const finding of group) {
    const reason = finding.reason + (finding.tier === 'pro' ? ' · Pro' : '');
    cards.push(`<article class="finding ${severity}"><p class="reason">${escapeHtml(reason)}</p><blockquote><mark>${escapeHtml(finding.snippet)}</mark></blockquote></article>`);
  }
}

// Use the actual popup as the template, without loading its extension-only script.
const template = await readFile(new URL('../extension/popup.html', import.meta.url), 'utf8');
const html = template
  .replace('href="popup.css"', 'href="../extension/popup.css"')
  .replace(/\s*<script type="module" src="popup\.js"><\/script>/, '')
  .replace('<main>', '<main inert>')
  .replace('Ready when you are.', () => escapeHtml(status))
  .replace('<div id="results"></div>', () => `<div id="results">${cards.join('\n')}</div>`)
  .replace('<p id="upsell" hidden>', displayedFindings.some((finding) => finding.tier === 'free') ? '<p id="upsell">' : '<p id="upsell" hidden>')
  .replace('</body>', '<p style="padding: 0 22px 16px; margin: 0; font-size: 11px; color: #626e69;">Static example render for documentation purposes - not an interactive page.</p>\n</body>');

await writeFile(new URL('./demo.html', import.meta.url), html, 'utf8');
console.log(`Generated demo/demo.html with ${displayedFindings.length} free-tier findings.`);
