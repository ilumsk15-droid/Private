/**
 * 誌面本文のための軽量マークアップ。
 * 外部ライブラリを入れずに済ませているのは、雑誌に必要な要素が少なく、
 * かつ組版（段組み・改行禁則）を自分で制御したいため。
 *
 *   ## 小見出し
 *   > 引用（インセット）
 *   - 箇条書き
 *   **強調**
 *   空行で段落区切り
 */

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] };

export function parseRichText(input: string | string[]): Block[] {
  const text = Array.isArray(input) ? input.join('\n\n') : input;
  const blocks: Block[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'list', items: list });
      list = [];
    }
  };

  for (const chunk of text.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    for (const line of lines) {
      if (line.startsWith('- ') || line.startsWith('・')) {
        list.push(line.replace(/^(-\s|・)/, ''));
        continue;
      }
      flushList();
      if (line.startsWith('## ')) blocks.push({ type: 'h', text: line.slice(3) });
      else if (line.startsWith('> ')) blocks.push({ type: 'quote', text: line.slice(2) });
      else {
        const last = blocks[blocks.length - 1];
        if (last && last.type === 'p' && lines.indexOf(line) > 0) last.text += line;
        else blocks.push({ type: 'p', text: line });
      }
    }
    flushList();
  }
  flushList();
  return blocks;
}

/** **強調** を分解する（dangerouslySetInnerHTML を使わないため） */
export function splitEmphasis(text: string): { text: string; strong: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**')
        ? { text: part.slice(2, -2), strong: true }
        : { text: part, strong: false },
    );
}

/** ざっくりの分量見積り（台割づくりの目安。厳密な溢れ判定は validate:layout） */
export function countCharacters(input: string | string[]): number {
  const text = Array.isArray(input) ? input.join('') : input;
  return text.replace(/\s/g, '').length;
}
