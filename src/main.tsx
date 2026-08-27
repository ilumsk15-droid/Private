import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/noto-sans-jp/300.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/zen-kaku-gothic-new/400.css';
import '@fontsource/zen-kaku-gothic-new/500.css';
import '@fontsource/zen-kaku-gothic-new/700.css';
import '@fontsource/shippori-mincho/400.css';
import '@fontsource/shippori-mincho/500.css';
import '@fontsource/shippori-mincho/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';

import './styles/reset.css';
import './styles/magazine.css';
import './styles/templates.css';
import './styles/guides.css';
import './styles/print.css';
import './styles/app.css';

import App from './preview/App';
import { PrintDocument, parsePrintOptions } from './print/PrintDocument';
import { refreshContent, setKnownImages } from './content/contentStore';

const options = parsePrintOptions(window.location.search);
const root = createRoot(document.getElementById('root')!);

/**
 * 描画の前にサーバ側の content/ を読みに行く。
 * こうしておくと、アプリで保存した内容・生成した号が、ビルドし直さなくても
 * プレビューにもPDF出力にも反映される（サーバが無ければビルド時の内容で動く）。
 */
async function boot() {
  await refreshContent();
  try {
    const res = await fetch('/api/images');
    if (res.ok) setKnownImages(((await res.json()) as { images: string[] }).images);
  } catch {
    /* サーバが無い場合はビルド時の画像一覧で判定する */
  }

  // 印刷用と画面プレビュー用でエントリを分けている。
  // PDF側にプレビューUIのCSSが混ざらないので、誌面が画面都合で崩れない。
  root.render(
    <StrictMode>
      {/* .mg-root は誌面の書体・文字色を決める。アプリUIまで巻き込むと
          画面が誌面の色になってしまうので、誌面を描く場所にだけ付ける */}
      {options ? (
        <div className="mg-root">
          <PrintDocument options={options} />
        </div>
      ) : (
        <App />
      )}
    </StrictMode>,
  );
}

void boot();
