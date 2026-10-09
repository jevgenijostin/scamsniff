import { rulePack } from './rules.js';

export const MAX_TEXT_LENGTH = 200_000;

/** Evaluate every tier. Offsets refer to the original input; only the first 200k characters are scanned. */
export function analyze(text, rules = rulePack) {
  if (typeof text !== 'string') throw new TypeError('Expected text to be a string');
  const input = text.slice(0, MAX_TEXT_LENGTH);
  return rules.flatMap((rule) => rule.match(input).map(({ index, snippet }) => ({
    id: rule.id, reason: rule.reason, severity: rule.severity, tier: rule.tier,
    snippet, index,
  })));
}

export function visibleFindings(findings, proEnabled = false) {
  return findings.filter((finding) => finding.tier === 'free' || (proEnabled && finding.tier === 'pro'));
}
