// Run with: node scripts/generate-icons.js (uses only Node built-ins).
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const output = new URL('../extension/icons/', import.meta.url);
mkdirSync(output, { recursive: true });

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  body.copy(result, 4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
  return result;
}

const shield = [[0.5, 0.05], [0.9, 0.2], [0.86, 0.59], [0.73, 0.8], [0.5, 0.96], [0.27, 0.8], [0.14, 0.59], [0.1, 0.2]];
function inShield(x, y) {
  let inside = false;
  for (let i = 0, j = shield.length - 1; i < shield.length; j = i++) {
    const [xi, yi] = shield[i];
    const [xj, yj] = shield[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function colorAt(x, y) {
  if (!inShield(x, y)) return [0, 0, 0, 0];
  const radius = Math.hypot(x - 0.46, y - 0.43);
  const handlePosition = Math.max(0, Math.min(1, ((x - 0.57) + (y - 0.54)) / 0.28));
  const handleDistance = Math.hypot(x - (0.57 + 0.14 * handlePosition), y - (0.54 + 0.14 * handlePosition));
  return (radius >= 0.115 && radius <= 0.175) || handleDistance <= 0.035
    ? [255, 255, 255, 255]
    : [15, 118, 110, 255];
}

for (const size of [16, 48, 128]) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  // Supersampling keeps the small toolbar icon legible and its edges smooth.
  const samples = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const color = colorAt((x + (sx + 0.5) / samples) / size, (y + (sy + 0.5) / samples) / size);
          for (let c = 0; c < 3; c++) sum[c] += color[c] * color[3] / 255;
          sum[3] += color[3];
        }
      }
      const offset = y * (1 + size * 4) + 1 + x * 4;
      for (let c = 0; c < 3; c++) raw[offset + c] = sum[3] ? Math.round(sum[c] * 255 / sum[3]) : 0;
      raw[offset + 3] = Math.round(sum[3] / (samples * samples));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // Eight bits per channel.
  header[9] = 6; // RGBA.
  writeFileSync(new URL(`icon-${size}.png`, output), Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}
