import { magazineConfig, mediaSize, type MagazineConfig } from './magazine.config';

/**
 * 設定オブジェクトを CSS カスタムプロパティへ落とす。
 * コンポーネントは常に var(--…) を読むので、判型やテーマを差し替えても
 * CSS を書き換える必要がない。
 */
export function toCssVariables(cfg: MagazineConfig = magazineConfig): Record<string, string> {
  const media = mediaSize(cfg);
  const t = cfg.typography;
  return {
    // ---- 判型 ----
    '--trim-w': `${cfg.format.trim.width}mm`,
    '--trim-h': `${cfg.format.trim.height}mm`,
    '--bleed': `${cfg.format.bleed}mm`,
    '--safety': `${cfg.format.safety}mm`,
    '--gutter-guard': `${cfg.format.gutterGuard}mm`,
    '--media-w': `${media.width}mm`,
    '--media-h': `${media.height}mm`,
    '--spread-w': `${cfg.format.trim.width * 2}mm`,

    // ---- 版面 ----
    '--m-top': `${cfg.layout.margin.top}mm`,
    '--m-outer': `${cfg.layout.margin.outer}mm`,
    '--m-bottom': `${cfg.layout.margin.bottom}mm`,
    '--m-inner': `${cfg.layout.margin.inner}mm`,
    '--col-gap': `${cfg.layout.columnGap}mm`,
    '--grid-cols': String(cfg.layout.grid.columns),
    '--grid-rows': String(cfg.layout.grid.rows),

    // ---- 色 ----
    '--c-base': cfg.color.base,
    '--c-accent': cfg.color.accent,
    '--c-accent-alt': cfg.color.accentAlt,
    '--c-text': cfg.color.text,
    '--c-text-muted': cfg.color.textMuted,
    '--c-text-on-dark': cfg.color.textOnDark,
    '--c-bg': cfg.color.background,
    '--c-bg-alt': cfg.color.backgroundAlt,
    '--c-bg-dark': cfg.color.backgroundDark,
    '--c-rule': cfg.color.rule,
    '--c-placeholder': cfg.color.placeholder,

    // ---- 書体 ----
    '--f-display': `${t.families.display}, ${t.families.body}, sans-serif`,
    '--f-body': `${t.families.body}, sans-serif`,
    '--f-serif': `${t.families.serif}, serif`,
    '--f-latin': `${t.families.latin}, ${t.families.body}, sans-serif`,

    // ---- 級数（pt 実寸） ----
    '--fs-body-s': `${t.size.bodyS}pt`,
    '--fs-body': `${t.size.body}pt`,
    '--fs-body-l': `${t.size.bodyL}pt`,
    '--fs-caption': `${t.size.caption}pt`,
    '--fs-credit': `${t.size.credit}pt`,
    '--fs-lead': `${t.size.lead}pt`,
    '--fs-subhead': `${t.size.subhead}pt`,
    '--fs-head': `${t.size.head}pt`,
    '--fs-head-l': `${t.size.headL}pt`,
    '--fs-display': `${t.size.display}pt`,
    '--fs-display-xl': `${t.size.displayXL}pt`,
    '--fs-folio': `${t.size.folio}pt`,

    // ---- 行間・字間・ウェイト ----
    '--lh-tight': String(t.leading.tight),
    '--lh-body': String(t.leading.body),
    '--lh-loose': String(t.leading.loose),
    '--tr-tight': t.tracking.tight,
    '--tr-normal': t.tracking.normal,
    '--tr-wide': t.tracking.wide,
    '--tr-latin': t.tracking.latin,
    '--w-light': String(t.weight.light),
    '--w-regular': String(t.weight.regular),
    '--w-medium': String(t.weight.medium),
    '--w-bold': String(t.weight.bold),

    // ---- 部品 ----
    '--folio-size': `${t.size.folio}pt`,
    '--folio-offset': `${cfg.folio.offset}mm`,
    '--rule-hairline': `${cfg.rule.hairline}mm`,
    '--rule-thick': `${cfg.rule.thick}mm`,
    '--img-radius': `${cfg.image.cornerRadius}mm`,
    '--qr-size': `${cfg.qr.size}mm`,
  };
}

/** :root に流し込む CSS テキストを生成 */
export function cssVariableBlock(cfg: MagazineConfig = magazineConfig, selector = ':root'): string {
  const vars = toCssVariables(cfg);
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}
