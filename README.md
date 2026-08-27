# THE INFLUENCER — 誌面制作システム

インフルエンサー特化型雑誌『THE INFLUENCER』の**再利用可能な誌面制作基盤**です。

64ページの誌面を1枚ずつ作り込むのではなく、**「テンプレート」＋「コンテンツデータ」＋「デザイン設定」**の3つに分けて管理します。号を変えるときに触るのは原則コンテンツデータだけで、コードには触れません。

```
台割（issue.json）→ テンプレート（React）→ 誌面 → プレビュー / PDF / 入稿チェック
        ↑                    ↑
   差し替えるのはここ    デザイン設定（magazine.config.ts）
```

---

## 1. すぐ動かす

```bash
npm install
npm run preview          # http://localhost:5173 でプレビューアプリが開く
```

| コマンド | 内容 |
|---|---|
| `npm run preview` | プレビューアプリを起動（開発モード・保存すると即反映） |
| `npm run build` | 型チェック＋静的ビルド（`dist/`）。PDF出力の前に必要 |
| `npm run serve` | ビルド結果を配信（PDF出力・組版チェックが使うサーバ） |
| `npm run validate` | 入稿前チェック（データ・構造）※ブラウザ不要 |
| `npm run validate:layout` | 組版チェック（文字溢れ・セーフティ超過・ノド逃げ）※ブラウザ使用 |
| `npm run export:pdf` | 全ページを1つのPDFに出力（`out/`） |
| `npm run export:pages` | 1ページ＝1PDFで出力 |
| `npm run export:spreads` | 見開き単位でPDF出力 |
| `npm run assets:placeholders` | サンプル用のプレースホルダー画像を再生成 |

---

## 2. プレビューアプリの使い方

左が**台割**、中央が**誌面**、右が**ページ情報**です。

- 表示モード：**表紙 / 1ページ / 見開き / 一覧（サムネイル）/ 印刷プレビュー**
- ズーム：**画面に合わせる / 100%**
- ガイド：**塗り足し / セーフティマージン / グリッド / ノド逃げ**（誌面には影響しません）
- 「入稿チェック」タブでエラー・警告を確認し、クリックでそのページへ移動

**キーボード**

| キー | 動作 |
|---|---|
| `←` `→` | ページ送り（見開き表示では2ページずつ） |
| `Home` / `End` | 先頭 / 最終ページ |
| `1` `2` `3` | 1ページ / 見開き / 一覧 |
| `0` | 100%表示 ⇔ 画面に合わせる |
| `b` `s` `g` `n` | 塗り足し / セーフティ / グリッド / ノド逃げ の表示切替 |

見開き表示では、**左に偶数ページ・右に奇数ページ**が必ず配置されます（左開き）。P1（表紙）だけは単独で右側に置かれます。

---

## 3. ディレクトリ構成

```
magazine/
├─ src/
│  ├─ config/
│  │   ├─ magazine.config.ts     ★判型・余白・色・書体・QR・表記義務などの唯一の設定元
│  │   └─ tokens.ts              設定 → CSSカスタムプロパティへの変換
│  ├─ schema/
│  │   ├─ common.ts              画像・QR・名言など共通データ型（Zod）
│  │   ├─ templates.ts           ★46テンプレートのデータ仕様＋メタ情報
│  │   └─ issue.ts               台割（issue.json）の仕様
│  ├─ content/
│  │   ├─ resolve.ts             台割 → ページ番号採番 → 見開き構築、$ref解決、QR一括変換
│  │   └─ browserLoader.ts       content/ をブラウザ側へ読み込む
│  ├─ validation/validate.ts     入稿前チェック本体（Node / ブラウザ共用）
│  ├─ components/magazine/       ページ枠・柱・ノンブル・写真枠・QR・図版などの共通部品
│  ├─ templates/                 46テンプレートの実装＋registry.tsx（ID→描画の対応表）
│  ├─ preview/                   プレビューアプリ（誌面とは別レイヤー）
│  ├─ print/PrintDocument.tsx    PDF出力専用の描画
│  └─ styles/                    magazine.css / templates.css / guides.css / print.css / app.css
├─ content/
│  └─ issue-001/                 ★号の中身（ここを差し替えて新しい号を作る）
│      ├─ issue.json             台割（ページの並び順・テンプレート指定）
│      ├─ cover.json  toc.json  editorial.json
│      ├─ feature/               巻頭特集（プロフィール・インタビュー・年表…）
│      ├─ half/                  後半企画（対談・アンケート・レビュー…）
│      ├─ ranking/               ランキング・データ
│      ├─ ads/ads.json           広告・タイアップ・有料枠
│      └─ back/back.json         次号予告・奥付
├─ public/images/issue-001/      画像（差し替えるのはここ）
├─ scripts/                      validate / validate-layout / export-pdf / プレースホルダー生成
└─ docs/ARCHITECTURE.md          設計の考え方と拡張方針
```

---

## 4. 編集のしかた

### 4-1. 文章・写真を差し替える

`content/issue-001/` の JSON / Markdown を書き換えるだけです。保存すればプレビューに即反映されます。

例：巻頭インタビューの本文を直す → `content/issue-001/feature/interview-1.md` を編集。

本文で使える簡易記法：

```markdown
## 小見出し
> 引用（アクセント罫つきで囲まれます）
- 箇条書き
**強調**

空行で段落を分けます。
```

見出し・名言・広告コピーの中の改行（`\n`）は、**そのまま誌面の改行になります**。「影響力は、\nどこから来るのか」のように、どこで折り返すかを編集側で決められます。

### 4-2. 新しい号を作る

```bash
cp -r content/issue-001 content/issue-002
cp -r public/images/issue-001 public/images/issue-002
```

`content/issue-002/issue.json` の先頭を書き換えます。

```json
{
  "id": "issue-002",
  "issueLine": "ISSUE 002",
  "title": "次号のテーマ",
  "releaseDate": "2026年5月28日",
  "pageCount": 64
}
```

画像パス（`/images/issue-001/...`）を新しい号のフォルダに一括置換すれば完了です。プレビューアプリ上部のセレクトボックスに自動で追加されます。**コードの変更は不要です。**

### 4-3. ページを増やす・減らす・並べ替える

`issue.json` の `pages` 配列を編集します。**ページ番号は配列の順序から自動採番される**ので、番号を振り直す必要はありません。

```jsonc
{
  "template": "interview-long",       // テンプレートID
  "section": "feature",               // sections で定義したID
  "span": 2,                          // 1=単ページ / 2=見開き1枚（偶数ページ始まり必須）
  "surface": "dark",                  // 任意：地色（light / alt / dark）
  "flags": { "ad": false, "ai": false, "draft": false },
  "note": "編集メモ（誌面には出ません）",
  "data": { "$ref": "feature/interviews.json#part1" }
}
```

- **並べ替え**：配列の要素を移動する
- **削除**：要素を消す
- **追加**：要素を足す
- 増減させたら `pageCount` も更新する（食い違うと `npm run validate` がエラーにします）

`data` は直接書いても、`{"$ref": "ファイル名.json#キー"}` で外部ファイルを参照しても構いません。`.md` を参照すると本文として読み込まれます。

**128ページへの拡張**：`pages` を増やして `pageCount` を 128 にするだけです。設定側の上限は `magazine.config.ts` の `pagination.maxPages` で管理しています。

### 4-4. 特集人物を差し替える

巻頭特集は次のファイルだけを見ています。人物を替えるときはここを書き換えます。

| ファイル | 内容 |
|---|---|
| `feature/profile.json` | 名前・肩書・プロフィール本文・SNS |
| `feature/interviews.json` + `interview-1.md` / `interview-2.md` | ロングインタビュー |
| `feature/timeline.json` | 年表 |
| `feature/numbers.json` | 数字で見る人物 |
| `feature/works.json` | 事業・活動実績 |
| `feature/relations.json` | 人物相関図 |
| `feature/quotes.json` / `quote-hero.json` | 名言 |
| `feature/videos.json` | 推奨動画＋QR |
| `feature/voices.json` | 関係者コメント |
| `feature/gear.json` / `schedule.json` / `qa.json` | 愛用品 / 1日 / 今後の展望 |
| `public/images/issue-XXX/` | 写真（同じファイル名で置き換えれば JSON は無変更） |

台割・テンプレート・デザインには一切触れずに人物を入れ替えられます。

### 4-5. デザインを変える

`src/config/magazine.config.ts` が唯一の設定元です。判型、塗り足し、セーフティマージン、ノド逃げ、色、書体、級数、行間、段組み、版面マージン、ノンブル位置、写真の角丸、罫線の太さ、QRサイズ、キャプション書式、広告・AI表記の必須ワードまでここに集約されています。

```ts
format: {
  trim: { width: 210, height: 280 },  // 仕上がり（mm）
  bleed: 3,                           // 塗り足し
  safety: 10,                         // セーフティマージン
  gutterGuard: 12,                    // ノド逃げ
}
```

判型を変えれば、プレビュー・組版チェック・PDFのページサイズがすべて追従します。

**号ごとの部分的なテーマ変更**は `issue.json` の `themeOverrides` で行えます（コードを触らずに色だけ替える用）。

```json
"themeOverrides": { "--c-accent": "#0B6E4F", "--f-display": "\"Noto Sans JP\", sans-serif" }
```

### 4-6. QRコード

```json
"qr": { "url": "https://example.com/videos/xxx", "label": "本編を見る（42分）", "size": 22 }
```

- URLを入れると自動でQRが生成されます。**URLが未設定（`null`）ならQRは描画されません**（空枠が誌面に残りません）。
- ブラウザ上ではリンクとして動作し、PDFにもリンクとして残ります。
- 印刷での読み取り下限は `magazine.config.ts` の `qr.minSize`（既定15mm）。下回るとバリデーションがエラーにします。
- **計測URLへの一括差し替え**は `issue.json` の `qr.trackingBase` / `qr.trackingParams` で行います。データ側のURLは素のまま保てます。

```json
"qr": {
  "trackingBase": "https://go.the-influencer.jp/r",
  "trackingParams": { "utm_source": "magazine", "utm_medium": "print", "utm_campaign": "issue-001" }
}
```

### 4-7. 画像

```json
{
  "src": "/images/issue-001/portrait-01.svg",
  "alt": "人物写真",
  "credit": "PHOTO: 撮影者名",
  "caption": "キャプション",
  "focus": { "x": 50, "y": 32 },   // object-position 相当（%）
  "spread": true,                   // 見開きにまたがる写真
  "gutterShift": 4,                 // ノドに顔がかかるときに外へ逃がす（mm）
  "placedWidthMm": 216              // 誌面上の配置幅。解像度チェックに使う
}
```

- `src` を `null` にすると、ダミー写真ではなく**「Image not set」の明示的なプレースホルダー**が出ます（必要解像度も表示）。サンプルではP61でこの挙動を確認できます。
- `placedWidthMm` を書いておくと `npm run validate` が実効dpiを計算し、300dpi未満を警告します。

---

## 5. 入稿前チェック

2種類あり、目的が違います。

### `npm run validate`（データ・構造）

ブラウザ不要・数秒で終わります。

ページ番号の重複／欠番、左右ページの不整合、見開きが奇数ページ始まりになっていないか、必須データの未入力、テンプレート仕様との不一致、画像ファイルの不存在、画像解像度不足、QRのURL未設定、QRサイズ不足、空ページ、指定ページ数との不一致、折丁（8の倍数）チェック、同じ画像の重複利用、クレジット未入力、**AI生成ページの注記漏れ**、**広告ページの「広告」「PR」表記漏れ**、目次のリンク先ページの存在。

**エラー（入稿不可）と警告（要確認）と情報**が分けて表示されます。エラーが1件でもあると終了コード1（CIで落とせます）。

### `npm run validate:layout`（組版）

実際に実寸で組んだ結果をブラウザから測ります。事前に `npm run build` と `npm run serve` が必要です（起動済みのサーバがあれば自動で再利用します）。

本文のオーバーフロー、セーフティマージンからの文字はみ出し、見開き中央のノド逃げ内の文字、描画内容のないページ。

```bash
npm run build
npm run serve &          # 別ターミナルでも可
npm run validate:layout
npm run validate:layout -- --range=1-16   # 範囲指定
```

同じチェックはプレビューアプリの「入稿チェック」タブからも確認できます（データ系のみ）。

---

## 6. PDF出力

```bash
npm run build            # 先にビルドが必要
npm run serve &          # 配信サーバ（export側でも自動起動を試みます）

npm run export:pdf                      # out/issue-001-book.pdf（全64ページ）
npm run export:pdf -- --marks           # トンボ付き
npm run export:pdf -- --range=1-16      # ページ範囲
npm run export:pdf -- --issue=issue-002 # 号を指定
npm run export:pages                    # out/issue-001-pages/p001.pdf … 1ページずつ
npm run export:spreads                  # 見開き単位
npm run export:pdf -- --skip-validate   # チェックを飛ばして強制出力
```

- 全ページを1つのHTMLに並べ、CSSの `@page` で改ページさせています。**ページ順は構造的に保証**され、1枚ずつ出して結合する方式で起きがちな順序事故がありません。
- 塗り足し3mmは常に含まれます（媒体ボックス＝216×286mm）。`--marks` を付けるとトンボ余白8mmが四辺に足され、232×302mmになります。
- QRと本文中のリンクは**PDFのリンクとして保持**されます。
- 出力前に `npm run validate` 相当のチェックが自動で走り、**エラーがあれば出力を中止**します。

### できること / できないこと

| | |
|---|---|
| ✅ できる | 64ページ通しPDF、ページ単位PDF、見開きPDF、トンボ付き、塗り足し付き、RGB版、ページ順の保証、PDFリンクの保持、出力前の自動チェック |
| ❌ できない | **CMYK変換**、**PDF/X-1a・PDF/X-4 への変換**、総インキ量の制御、特色（DIC/PANTONE）指定、フォントの完全埋め込み保証（ブラウザ出力のためサブセット化されます）、オーバープリント設定 |

ブラウザから生成するPDFは必ずRGBになります。**CMYK変換とPDF/X化は、印刷会社または Acrobat Pro / InDesign 等での最終工程が前提**です。本システムが出すのは「印刷会社確認用のRGB入稿PDF」の位置づけです。

---

## 7. 印刷会社へ入稿する前に必要な作業

1. **画像の差し替え**：サンプルはSVGの図版です。実写（300dpi以上のCMYKまたはAdobeRGB）に置き換えてください。
2. **`npm run validate` と `npm run validate:layout` をエラー0にする**。
3. **CMYK変換**：出力したRGB PDFを、印刷会社指定のプロファイル（Japan Color 2001 Coated 等）でCMYK変換。
4. **PDF/X化**：X-1a か X-4 か、総インキ量の上限（通常320〜350%）を印刷会社に確認。
5. **フォントの扱い**：ブラウザ出力ではサブセット埋め込みになります。文字化けリスクを避けたい場合はアウトライン化の可否を印刷会社に確認してください。使用書体（Noto Sans JP / Zen Kaku Gothic New / Shippori Mincho / Inter）はすべてSIL Open Font Licenseで商用利用・埋め込みが可能です。
6. **黒の指定**：本文の黒はRGB `#17181C` です。スミ1色にするか、リッチブラックにするかを指定してください。
7. **ページ数**：総ページ数が折丁の倍数（既定8）になっているか。`npm run validate` が警告します。
8. **奥付**：`content/*/back/back.json` の所在地・印刷会社名・ISBN/ISSNなど未設定項目を埋めてください。
9. **QRの実機確認**：出力したPDFを実寸で印刷し、実際のスマートフォンで読み取り確認をしてください。
10. **表記の最終確認**：広告面の「広告」「PR」表記、AI生成ページの注記、写真クレジット。

---

## 8. 実装済みの機能

- **設計・構成**：設定ファイル一元管理、台割データからの誌面生成、ページ番号の自動採番、見開きの左右関係の保証、$refによるコンテンツ分割、号ごとのテーマ上書き
- **テンプレート46種**：表紙4／扉・目次4／人物特集12／名言・動画6／対談・企画8／ランキング・データ6／広告・終盤6（一覧は `src/schema/templates.ts`）
- **共通部品**：ページ枠、見開き、柱、ノンブル、セーフエリア、塗り足し、トンボ、写真枠（トリミング位置・見開き対応・ノド逃げ調整・クレジット・プレースホルダー）、QR、名言、本文（簡易マークダウン／段組み）、年表、ランキング、比較表、相関図、ポジショニングマップ、グラフ4種
- **プレビュー**：表紙／1ページ／見開き／サムネイル一覧／印刷プレビュー、ページ指定移動、前後移動、キーボード操作、100%表示、画面に合わせる、塗り足し・セーフティ・グリッド・ノド逃げの表示切替、台割パネル、入稿チェックパネル
- **PDF出力**：通しPDF、ページ単位、見開き単位、トンボ付き、塗り足し付き、範囲指定、出力前チェック、PDFリンク保持
- **バリデーション**：データ系18項目＋組版系4項目、エラー／警告／情報の3段階
- **サンプルデータ**：64ページ分（架空のインフルエンサー「湊ハルキ」）

## 9. 未実装（データ構造とインターフェースのみ用意）

今回のフェーズでは実データ連携まで行っていません。拡張の受け口だけ用意してあります。

| 機能 | 現状 | 拡張の入口 |
|---|---|---|
| ランキングAPI連携 | `ranking/*.json` を手で編集 | `content/` のJSONを生成するスクリプトを追加すれば、テンプレート側は無変更 |
| QRアクセス計測 | `qr.trackingBase` でURLを一括変換する仕組みのみ | 計測サービスのドメインを設定すれば即時に有効 |
| 会員機能・決済 | なし | — |
| 本人承認ワークフロー | `flags.draft`（未入稿マーク）のみ | `PageSpec` に承認状態を足し、バリデーションで「未承認ページの出力禁止」を追加する想定 |
| CMYK / PDF-X変換 | なし（印刷会社工程） | `scripts/export-pdf.ts` の後段にGhostscript等を挟む余地あり |

そのほか、`cover-headline`（人物＋大見出しの表紙）、`cover-multi`（複数人物の表紙）、`quote-annotated`（名言＋解説）の3テンプレートは実装済みですが、サンプル号では使っていません。`issue.json` の `template` を書き換えれば使えます。

---

## 10. 現時点での制約・注意点

- **サンプルの人物は架空です。** 仕様書では実在のYouTuberを例に挙げられていましたが、実在人物に架空の経歴・発言・数値を割り当てたデータはそのまま外部に出ると誤情報になり得るため、仕様18-6の「架空人物」に従い、架空のインフルエンサー「湊ハルキ」で作成しています。差し替えは §4-4 の手順で完結します。
- **サンプル画像はすべて生成した図版（SVG）です。** 実写ではありません。権利上安全な代替として、レイアウト確認に耐える幾何図版を決定論的に生成しています（`npm run assets:placeholders`）。
- **ブラウザ出力PDFはRGB固定**です（§6参照）。
- **PC表示前提**です。プレビューアプリはスマートフォン向けの最適化をしていません。
- **目次のページ番号は自動連動しません。** 台割からページ番号を機械的に流し込むと、編集意図（「特集は10ページからと書きたい」等）を上書きしてしまうため、`toc.json` に明示的に書く方式にしています。存在しないページを指していれば `npm run validate` がエラーにします。
- **組版チェックはブラウザのレンダリング結果に依存します。** フォントのバージョンが変わると1〜2mm程度ずれる可能性があります。入稿直前は必ず実寸のPDFで目視確認してください。
- **CSSはグローバルです。** テンプレート固有のスタイルは必ず `.tpl-<テンプレートID>` 配下に書いてください（`src/styles/templates.css` の冒頭に明記）。この規約を守っている限り、1ページの調整が他ページに波及しません。
- 実在雑誌のデザイン・ロゴは一切複製していません。フォントはすべてOFL（商用利用可）です。

---

## 11. 設計の考え方と今後の拡張方針

`docs/ARCHITECTURE.md` を参照してください。
