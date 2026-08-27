import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AssetInfo } from '../../src/validation/validate';

const PUBLIC_DIR = resolve(process.cwd(), 'public');

/**
 * 画像の実ピクセルをファイルヘッダから読む。
 * 画像処理ライブラリ（ネイティブ依存）を足さずに済ませるため、
 * 必要な形式だけ最小限に解釈している。
 */
export function inspectAsset(src: string): AssetInfo {
  const file = resolve(PUBLIC_DIR, src.replace(/^\//, ''));
  if (!existsSync(file)) return { exists: false };
  if (/\.svg$/i.test(file)) return { exists: true, vector: true };

  const buf = readFileSync(file);
  const dim = pngSize(buf) ?? jpegSize(buf) ?? webpSize(buf);
  return dim ? { exists: true, ...dim } : { exists: true };
}

function pngSize(b: Buffer) {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function jpegSize(b: Buffer) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    // SOF0–SOF15（DHT/DAC/RST は除く）にサイズが入っている
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

function webpSize(b: Buffer) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fmt = b.toString('ascii', 12, 16);
  if (fmt === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (fmt === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (fmt === 'VP8X') return { width: (b.readUIntLE(24, 3) & 0xffffff) + 1, height: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
  return null;
}
