import { useMemo } from 'react';
import { magazineConfig, type MagazineConfig } from '../../config/magazine.config';
import { cssVariableBlock } from '../../config/tokens';

/**
 * 設定 → CSS変数を1か所で流し込む。
 * 号ごとの themeOverrides（色や書体の部分差し替え）もここで適用するので、
 * テーマ変更のためにコンポーネントを触る必要がない。
 */
export function ThemeStyle({
  config = magazineConfig,
  overrides,
}: {
  config?: MagazineConfig;
  overrides?: Record<string, string>;
}) {
  const css = useMemo(() => {
    const base = cssVariableBlock(config);
    if (!overrides || Object.keys(overrides).length === 0) return base;
    const extra = Object.entries(overrides)
      .map(([k, v]) => `  ${k.startsWith('--') ? k : `--${k}`}: ${v};`)
      .join('\n');
    return `${base}\n:root {\n${extra}\n}`;
  }, [config, overrides]);

  return <style data-magazine-theme>{css}</style>;
}
