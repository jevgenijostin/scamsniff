// Demo-only checksum, intentionally not a payment or security boundary.
function checksum(payload) {
  let sum = 0;
  for (const char of payload) sum = (sum * 31 + char.charCodeAt(0)) % 65536;
  return sum.toString(16).toUpperCase().padStart(4, '0');
}

export function createDemoKey(payload = 'DEMO2026') {
  if (!/^[A-Z0-9]{8}$/.test(payload)) throw new Error('Use exactly eight uppercase letters or digits');
  return `SS-PRO-${payload}-${checksum(payload)}`;
}

export function isValidLicense(key) {
  if (typeof key !== 'string') return false;
  const match = /^SS-PRO-([A-Z0-9]{8})-([A-F0-9]{4})$/.exec(key.trim().toUpperCase());
  return Boolean(match && checksum(match[1]) === match[2]);
}
