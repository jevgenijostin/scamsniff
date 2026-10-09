// Rules return source-text matches; no browser APIs or network access.
const first = (pattern, text) => new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '')).exec(text);
const single = (pattern) => (text) => {
  const match = first(pattern, text);
  return match ? [{ index: match.index, snippet: match[0] }] : [];
};
// Related signals must occur within 300 characters, in either order.
const combo = (left, right) => (text) => {
  const matches = text.matchAll(new RegExp(left.source, `${left.flags.replace(/[gy]/g, '')}g`));
  for (const a of matches) {
    const start = Math.max(0, a.index - 300);
    // Match the whole signal before checking its start, so the window cannot truncate it.
    const b = first(right, text.slice(start));
    if (b && start + b.index <= a.index + a[0].length + 300) {
      const from = Math.min(a.index, start + b.index);
      const to = Math.max(a.index + a[0].length, start + b.index + b[0].length);
      return [{ index: from, snippet: text.slice(from, to) }];
    }
  }
  return [];
};

const urgency = /\b(?:act now|urgent action|verify immediately|your account (?:will be|has been) suspended|within 24 hours|24 hours|jetzt handeln|sofort (?:bestätigen|verifizieren)|(?:ihr|dein) konto (?:wird|wurde) gesperrt|24 stunden|dringend erforderlich)\b/iu;
const payment = /\b(?:pay|payment|send|purchase|buy|bezahlen|zahlen|zahlung|senden|kaufe[n]?)\b/iu;
const methods = /\b(?:gift cards?|giftcards?|wire transfer|crypto(?:currency)? only|only (?:crypto|bitcoin)|bitcoin only|geschenkkarten?|gutscheinkarten?|banküberweisung|nur (?:krypto|bitcoin)|ausschließlich (?:krypto|bitcoin))\b/iu;
const greeting = /\b(?:dear (?:customer|user)|valued customer|liebe[r]? kund(?:e|in)|sehr geehrte[r]? kund(?:e|in))\b/iu;
const infoRequest = /\b(?:verify|confirm|provide|send|enter|update|bestätigen|verifizieren|senden|geben|aktualisieren)[^.!?\n]{0,100}\b(?:password|login|credit card|bank details|social security|personal (?:information|details)|passwort|kreditkarte|bankdaten|zugangsdaten|persönliche[n]? daten)\b/iu;
const shortener = /(?:https?:\/\/)?\b(?:bit\.ly|tinyurl\.com|t\.co|is\.gd|rb\.gy|cutt\.ly|shorturl\.at)\/[\w-]+/iu;

function lookalikes(text) {
  const results = [];
  const domains = text.matchAll(/(?<![\p{L}\p{N}_-])(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+[\p{L}]{2,24}(?![\p{L}\p{N}_-])/gu);
  for (const match of domains) {
    const domain = match[0];
    const mixed = /[a-z]/i.test(domain) && /[\u0400-\u04ff]/u.test(domain);
    const imitation = domain.split('.').some((label) => /^(?:paypaI|arnazon|amaz0n|paypa1|micr0soft|g00gle|app1e)$/.test(label) || /^(?:arnazon|amaz0n|paypa1|micr0soft|g00gle|app1e)$/i.test(label));
    if (mixed || imitation) results.push({ index: match.index, snippet: domain });
    if (results.length >= 20) break;
  }
  return results;
}

export const rulePack = [
  { id: 'urgency', severity: 'medium', reason: 'Pressure to act quickly', tier: 'free', match: single(urgency) },
  { id: 'lookalike-domain', severity: 'high', reason: 'Possible lookalike or mixed-script domain', tier: 'free', match: lookalikes },
  { id: 'risky-payment', severity: 'high', reason: 'Request involving a hard-to-reverse payment method', tier: 'free', match: combo(payment, methods) },
  { id: 'generic-info-request', severity: 'high', reason: 'Generic greeting paired with a request for sensitive information', tier: 'free', match: combo(greeting, infoRequest) },
  { id: 'urgent-short-link', severity: 'high', reason: 'Shortened link paired with pressure to act', tier: 'free', match: combo(shortener, urgency) },
  { id: 'romance-money', severity: 'high', reason: 'Romantic language paired with a money request', tier: 'pro', match: combo(/\b(?:my love|soulmate|love you|mein schatz|ich liebe dich)\b/iu, /\b(?:send (?:me )?money|pay for (?:my )?(?:flight|visa)|send[e]? mir geld|geld überweisen|flug bezahlen)\b/iu) },
  { id: 'job-upfront-fee', severity: 'high', reason: 'Job offer paired with an upfront payment', tier: 'pro', match: combo(/\b(?:job offer|work from home|you(?:'re| are) hired|jobangebot|heimarbeit|stellenangebot)\b/iu, /\b(?:upfront fee|pay for (?:your )?(?:equipment|training)|registration fee|vorkasse|startgebühr|registrierungsgebühr)\b/iu) },
  { id: 'crypto-guarantee', severity: 'high', reason: 'Crypto investment paired with guaranteed returns', tier: 'pro', match: combo(/\b(?:crypto|bitcoin|krypto|ethereum)\b/iu, /\b(?:guaranteed (?:returns?|profits?)|risk[ -]free|double your money|garantierte[nr]? (?:rendite|gewinne?)|risikofrei|geld verdoppeln)\b/iu) },
];
