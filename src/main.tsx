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

const options = parsePrintOptions(window.location.search);
const root = createRoot(document.getElementById('root')!);

// 印刷用と画面プレビュー用でエントリを分けている。
// PDF側にプレビューUIのCSSが混ざらないので、誌面が画面都合で崩れない。
root.render(
  <StrictMode>
    {options ? (
      <div className="mg-root">
        <PrintDocument options={options} />
      </div>
    ) : (
      <div className="mg-root">
        <App />
      </div>
    )}
  </StrictMode>,
);
