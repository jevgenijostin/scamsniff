import { describe, expect, it } from 'vitest';
import { analyze, MAX_TEXT_LENGTH, summarizeFindings, visibleFindings } from '../extension/engine/index.js';
import { rulePack } from '../extension/engine/rules.js';
import { createDemoKey, isValidLicense } from '../extension/engine/license.js';

const cases = [
  ['urgency', ['Act now to keep access', 'Your account will be suspended', 'Verify immediately', 'You have 24 hours', 'Jetzt handeln!', 'Ihr Konto wird gesperrt', 'Sofort bestätigen', 'Innerhalb von 24 Stunden'], ['Take your time.', 'Ihr Konto ist verfügbar.']],
  ['lookalike-domain', ['Visit paypaI.com', 'https://arnazon.com/login', 'раypal.com', 'shop.amaz0n.de', 'micr0soft.com'], ['paypal.com amazon.com microsoft.com', 'example.org', 'пример.рф', 'notarnazon.com']],
  ['risky-payment', ['Pay via gift card', 'Send a wire transfer', 'Payment: crypto only', 'Bitte zahlen mit Geschenkkarten', 'Zahlung nur Bitcoin', 'Buy gift cards and send the codes'], ['We discuss gift cards.', 'Pay by credit card.', 'Krypto ist ein Diskussionsthema.']],
  ['generic-info-request', ['Dear Customer, please verify your password', 'Provide bank details, dear customer', 'Sehr geehrter Kunde, bestätigen Sie Ihre Bankdaten', 'Liebe Kundin, geben Sie Ihre persönlichen Daten ein'], ['Dear Customer, welcome to our newsletter', 'Hello Jane, here is your receipt', 'Bitte bestätigen Sie Ihre Bankdaten']],
  ['urgent-short-link', ['Act now: https://bit.ly/abc', 'https://tinyurl.com/abc Jetzt handeln', 'Verify immediately at t.co/hello'], ['Visit bit.ly/abc whenever convenient', 'Act now: https://example.com', 'Act now at notbit.ly/abc']],
  ['romance-money', ['My love, send me money', 'Ich liebe dich, sende mir Geld', 'My soulmate, pay for my flight'], ['My love, see you tonight', 'Send me money for the invoice']],
  ['job-upfront-fee', ['Job offer: pay for your equipment', 'Work from home. Registration fee required', 'Stellenangebot: Startgebühr erforderlich'], ['Job offer: no experience required', 'Training is available for everyone']],
  ['crypto-guarantee', ['Crypto investment with guaranteed returns', 'Bitcoin is risk-free', 'Krypto: garantierte Rendite'], ['Crypto prices can fall', 'Guaranteed delivery of your books']],
];

describe('finding summaries', () => {
  it('summarizes empty findings', () => {
    expect(summarizeFindings([])).toBe('No red flags found in this selection.');
  });
  it('summarizes one finding', () => {
    expect(summarizeFindings(analyze('Act now'))).toBe('1 red flag found: urgency');
  });
  it('counts distinct IDs and preserves their first-seen order', () => {
    const findings = ['urgency', 'lookalike-domain', 'lookalike-domain', 'risky-payment', 'urgency'].map((id) => ({ id }));
    expect(summarizeFindings(findings)).toBe('3 red flags found: urgency, lookalike-domain, risky-payment');
  });
});

describe.each(cases)('%s', (id, positives, negatives) => {
  it.each(positives)('detects %s', (text) => {
    const found = analyze(text).find((finding) => finding.id === id);
    expect(found).toBeDefined();
    expect(found.snippet.length).toBeGreaterThan(0);
    expect(text.slice(found.index, found.index + found.snippet.length)).toBe(found.snippet);
    expect(['low', 'medium', 'high']).toContain(found.severity);
    expect(found.reason).toBeTruthy();
  });
  it.each(negatives)('does not flag %s', (text) => {
    expect(analyze(text).some((finding) => finding.id === id)).toBe(false);
  });
});

describe('engine behavior', () => {
  it.each(['', '   \n\t', 'A pleasant day. Einen schönen Tag!'])('handles harmless input %j', (text) => expect(analyze(text)).toEqual([]));
  it('rejects non-text', () => expect(() => analyze(null)).toThrow(TypeError));
  it('handles mixed DE/EN and multiline text', () => {
    expect(analyze('Dear Customer,\nplease send your password. Jetzt handeln!').map((f) => f.id)).toEqual(expect.arrayContaining(['urgency', 'generic-info-request']));
  });
  it('does not combine distant signals', () => expect(analyze(`Dear Customer ${'x'.repeat(700)} provide your password`)).toEqual([]));
  it.each([299, 300, 301])('checks the right signal start at distance %i', (distance) => {
    const text = `Pay${' '.repeat(distance)}gift card`;
    expect(analyze(text).some((f) => f.id === 'risky-payment')).toBe(distance <= 300);
  });
  it.each([299, 300, 301])('checks the left signal start at distance %i', (distance) => {
    const text = `gift card${' '.repeat(distance - 'gift card'.length)}Pay`;
    expect(analyze(text).some((f) => f.id === 'risky-payment')).toBe(distance <= 300);
  });
  it('finds a later relevant greeting', () => expect(analyze(`Dear Customer ${'x'.repeat(700)} Dear Customer, provide your password`).map((f) => f.id)).toContain('generic-info-request'));
  it('scans a large input and caps the work', () => {
    expect(analyze(`Act now ${'x'.repeat(1_000_000)}`).map((f) => f.id)).toContain('urgency');
    expect(analyze(`${' '.repeat(MAX_TEXT_LENGTH)}Act now`)).toEqual([]);
  });
  it('caps domain findings', () => expect(analyze('paypaI.com '.repeat(100)).length).toBe(20));
  it('is deterministic across repeated calls', () => expect(analyze('Act now paypaI.com')).toEqual(analyze('Act now paypaI.com')));
  it('keeps HTML as plain text', () => expect(analyze('<script>Act now</script>')[0].snippet).toBe('Act now'));
  it('supports an additional rule pack', () => expect(analyze('hello', [{ id: 'custom', severity: 'low', tier: 'pro', reason: 'Example', match: () => [{ index: 0, snippet: 'hello' }] }])[0].id).toBe('custom'));
  it('has unique rule identifiers', () => expect(new Set(rulePack.map((r) => r.id)).size).toBe(rulePack.length));
  it('evaluates Pro before filtering and defaults to free', () => {
    const all = analyze('Act now. Crypto guaranteed returns');
    expect(all.some((f) => f.tier === 'pro')).toBe(true);
    expect(visibleFindings(all).every((f) => f.tier === 'free')).toBe(true);
    expect(visibleFindings(all, true)).toEqual(all);
    expect(all.length).toBe(2);
  });
});

describe('local demo license', () => {
  it('accepts a valid checksum', () => expect(isValidLicense(createDemoKey())).toBe(true));
  it('normalizes case and surrounding whitespace', () => expect(isValidLicense(` ${createDemoKey().toLowerCase()} `)).toBe(true));
  it.each([undefined, null, '', 'paid', 'SS-PRO-DEMO2026-0000', 'SS-PRO-DEMO2026-FFFF-extra'])('rejects invalid key %s', (key) => expect(isValidLicense(key)).toBe(false));
  it('rejects a changed payload', () => expect(isValidLicense(createDemoKey().replace('DEMO2026', 'DEMO2027'))).toBe(false));
  it('validates generator payload', () => expect(() => createDemoKey('bad')).toThrow());
});
