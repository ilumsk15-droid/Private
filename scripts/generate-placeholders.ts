/**
 * サンプル誌面用の版画的プレースホルダーを生成する。
 *
 * 実在人物の写真は権利上ここへ置けないので、レイアウト確認に耐える
 * 「図版」を決定論的に生成している（同じ名前なら常に同じ絵になる）。
 * 本番では public/images/<issue>/ の同名ファイルを実写に差し替えれば、
 * content 側を一切触らずに誌面が本番になる。
 *
 *   npm run assets:placeholders
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUT_DIR = resolve(process.cwd(), 'public/images/issue-001');

/** 決定論的な擬似乱数（同じ seed なら常に同じ図版） */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

const PALETTES: [string, string, string][] = [
  ['#12141A', '#C8102E', '#E7E3DB'],
  ['#1B2430', '#B99049', '#EFEDE8'],
  ['#0F1512', '#3F6B5A', '#E8E6DF'],
  ['#211A22', '#8A5A78', '#EDE9E4'],
  ['#181A1F', '#4A6D9B', '#E9E7E2'],
];

type Kind = 'portrait' | 'scene' | 'object' | 'thumb';

function plate(seed: string, w: number, h: number, kind: Kind): string {
  const r = rng(seed);
  const [bg, accent, light] = PALETTES[Math.floor(r() * PALETTES.length)];
  const parts: string[] = [];
  parts.push(`<rect width="${w}" height="${h}" fill="${bg}"/>`);

  if (kind === 'portrait') {
    // 人物写真の代替：中央よりやや上に楕円のシルエット＋垂直の帯
    const cx = w * (0.42 + r() * 0.16);
    const cy = h * 0.42;
    const rx = w * 0.26;
    parts.push(`<rect x="${w * 0.1}" y="0" width="${w * 0.18}" height="${h}" fill="${accent}" opacity="0.16"/>`);
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 1.28}" fill="${light}" opacity="0.9"/>`);
    parts.push(`<rect x="${cx - rx * 1.15}" y="${cy + rx * 1.1}" width="${rx * 2.3}" height="${h - cy - rx * 1.1}" fill="${light}" opacity="0.9"/>`);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${rx * 0.52}" fill="${bg}" opacity="0.12"/>`);
  } else if (kind === 'scene') {
    const bands = 3 + Math.floor(r() * 3);
    for (let i = 0; i < bands; i++) {
      const y = (h / bands) * i;
      parts.push(`<rect x="0" y="${y}" width="${w}" height="${h / bands}" fill="${i % 2 ? light : accent}" opacity="${0.14 + i * 0.12}"/>`);
    }
    parts.push(`<circle cx="${w * (0.2 + r() * 0.6)}" cy="${h * (0.25 + r() * 0.4)}" r="${Math.min(w, h) * 0.22}" fill="${accent}" opacity="0.75"/>`);
    parts.push(`<rect x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.88}" height="${h * 0.88}" fill="none" stroke="${light}" stroke-width="${Math.max(w, h) * 0.004}" opacity="0.5"/>`);
  } else if (kind === 'object') {
    parts.push(`<rect width="${w}" height="${h}" fill="${light}"/>`);
    const s = Math.min(w, h) * 0.44;
    parts.push(`<rect x="${(w - s) / 2}" y="${(h - s) / 2}" width="${s}" height="${s}" fill="${bg}" opacity="0.88" transform="rotate(${(r() * 24 - 12).toFixed(1)} ${w / 2} ${h / 2})"/>`);
    parts.push(`<circle cx="${w / 2}" cy="${h / 2}" r="${s * 0.28}" fill="${accent}"/>`);
  } else {
    parts.push(`<rect width="${w}" height="${h}" fill="${bg}"/>`);
    parts.push(`<rect x="0" y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="${accent}" opacity="0.9"/>`);
    const bars = 4 + Math.floor(r() * 4);
    for (let i = 0; i < bars; i++) {
      const bw = w / (bars * 1.6);
      parts.push(`<rect x="${w * 0.08 + i * bw * 1.35}" y="${h * (0.18 + r() * 0.28)}" width="${bw}" height="${h * 0.3}" fill="${light}" opacity="${0.35 + r() * 0.5}"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"><title>${seed}</title>${parts.join('')}</svg>`;
}

const SPEC: { name: string; w: number; h: number; kind: Kind }[] = [
  { name: 'cover-main.svg', w: 2551, h: 3401, kind: 'portrait' },
  { name: 'feature-spread-01.svg', w: 5032, h: 3401, kind: 'portrait' },
  { name: 'feature-spread-02.svg', w: 5032, h: 3401, kind: 'scene' },
  { name: 'feature-prologue.svg', w: 5032, h: 3401, kind: 'scene' },
  { name: 'portrait-01.svg', w: 2551, h: 3401, kind: 'portrait' },
  { name: 'portrait-02.svg', w: 2551, h: 3401, kind: 'portrait' },
  { name: 'portrait-03.svg', w: 1800, h: 2400, kind: 'portrait' },
  { name: 'portrait-04.svg', w: 1800, h: 2400, kind: 'portrait' },
  { name: 'scene-01.svg', w: 2551, h: 1700, kind: 'scene' },
  { name: 'scene-02.svg', w: 2551, h: 1700, kind: 'scene' },
  { name: 'scene-03.svg', w: 2551, h: 1700, kind: 'scene' },
  { name: 'scene-04.svg', w: 2551, h: 1700, kind: 'scene' },
  { name: 'scene-05.svg', w: 2551, h: 1700, kind: 'scene' },
  { name: 'editor.svg', w: 900, h: 900, kind: 'portrait' },
  { name: 'contents.svg', w: 1800, h: 2400, kind: 'scene' },
  { name: 'ad-cover2.svg', w: 2551, h: 3401, kind: 'object' },
  { name: 'ad-spread.svg', w: 5032, h: 3401, kind: 'object' },
  { name: 'ad-back.svg', w: 2551, h: 3401, kind: 'object' },
  { name: 'tieup-01.svg', w: 1800, h: 1200, kind: 'scene' },
  { name: 'tieup-02.svg', w: 1800, h: 1200, kind: 'object' },
  { name: 'next-issue.svg', w: 2551, h: 1700, kind: 'portrait' },
];

for (let i = 6; i <= 14; i++) SPEC.push({ name: `scene-${String(i).padStart(2, '0')}.svg`, w: 2551, h: 1700, kind: 'scene' });
for (let i = 1; i <= 12; i++) SPEC.push({ name: `gear-${String(i).padStart(2, '0')}.svg`, w: 1200, h: 1200, kind: 'object' });
for (let i = 1; i <= 30; i++) SPEC.push({ name: `thumb-${String(i).padStart(2, '0')}.svg`, w: 1920, h: 1080, kind: 'thumb' });
for (let i = 1; i <= 24; i++) SPEC.push({ name: `face-${String(i).padStart(2, '0')}.svg`, w: 900, h: 1100, kind: 'portrait' });
for (let i = 1; i <= 8; i++) SPEC.push({ name: `gallery-${String(i).padStart(2, '0')}.svg`, w: 1600, h: 1600, kind: 'scene' });

mkdirSync(OUT_DIR, { recursive: true });
for (const s of SPEC) {
  const file = resolve(OUT_DIR, s.name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, plate(s.name, s.w, s.h, s.kind), 'utf8');
}
console.log(`generated ${SPEC.length} placeholder plates -> public/images/issue-001/`);
