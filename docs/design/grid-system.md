# KJR020's Blog Grid system

ページ横方向の配置を決める仕様。ページシェルの幅、余白、主要領域の並べ方を扱う。

Article内部の幅、本文の行長、コード・表・図の表示は[記事の読書設計](design-system.md#記事の読書設計)が正本であり、この文書では再定義しない。

## 目的

読者が主要な情報を見つけ、読み進められるように、ページの骨格を揃える。記事、一覧、検索結果、サイドバーなどのトップレベル領域の幅と位置をここで決め、ボタン、アイコン、カード内部などの小さな要素はspacing tokenで整える。

## 要件

配置を変更したあとも、次を満たす

- 主要領域と操作が欠落・重複しない。Breakpointの直前と直後でも同じとする
- 長い見出し、URL、コード、表を含んでも、通常の本文を読むためにページ全体の横スクロールを必要としない
- 横幅が必要な内容は、対応する領域の内部で全体へ到達できる。`overflow: hidden`で切り取って解決しない
- 読み順とフォーカス順が、情報の関係と操作の流れを保つ。視覚配置だけの変更で順序の意味を変えない
- 隣接する独立した領域の間に、区切りとして機能する余白を保つ

要件は変更後の判定基準とする。以下の標準仕様は、要件を満たすために現在採用している値であり、変更管理の対象とする。

## Breakpoints

Tailwindの`md`と`lg`に合わせて3段階とする。判定はコンテンツ領域ではなく、viewport全体の幅で行う。

| モード | Viewport | Tailwind | 主要領域の構成 |
| --- | --- | --- | --- |
| Compact | 767px以下 | 既定 | 縦積み、目次は本文上部の折りたたみ |
| Medium | 768px以上 | `md` | 縦積み、水平navigation、目次は本文上部の折りたたみ |
| Wide | 1024px以上 | `lg` | 本文とRailの2カラム |

メディアクエリの判定は`48rem`と`64rem`で行う。相対単位の基準はルート要素のfont-size指定ではなくブラウザの初期値なので、768pxと1024pxは既定設定での換算値として扱う。

320px未満でも内容は欠落させず、Compactを流動的に縮小する。

## ページシェル

すべてのページで、シェルに左右16pxの内側余白（`px-4`）を確保する。シェルは中央寄せする。中央寄せで生じる外側の余白は、この内側余白とは別のものとして扱う。

最大幅は、左右の内側余白を含むシェルの幅とする。

| ページ | 最大幅 | 根拠 |
| --- | --- | --- |
| 記事詳細 | 1152px（`max-w-6xl`） | 本文とRailを横に並べる |
| Privacy Policy | 768px（`max-w-3xl`） | 読むことが主目的で、補助領域を持たない |
| ホーム、記事一覧、検索 | Breakpoint連動（Tailwindの`container`） | 固定の上限を設けていない |
| 404 | シェルを使わず中央揃えで配置する | 単一のメッセージと導線だけを持つ |

ホーム、記事一覧、検索の上限は、Tailwindの`container`の既定に従い、各Breakpointの値になる。固定幅へ揃えるかは未決とし、決めるまでこの表を正本とする。

## 2カラム配置

WideではArticleとRailを横に並べる。Railの幅は列数から導かず、固定値で指定する。

| ページ | カラム構成 | 列間 |
| --- | --- | --- |
| 記事詳細 | `minmax(0, 1fr)` と 250px | 2.618rem（φ²） |
| 検索 | `minmax(0, 1fr)` と 250px | 2rem |

CompactとMediumでは1カラムへ戻し、Railの内容を本文の前後へ移す。記事詳細では目次を記事ヘッダーの直後へ、検索ではTag filtersを検索結果の下へ置く。

### 記事ヘッダー

Wideでは記事ヘッダーを全幅に置き、右側を装飾用のキャラクター領域として空ける。タイトルとメタ情報は左側に収める。キャラクターはCompactとMediumでは表示しない。

### 目次の開閉

Wideで目次を閉じたとき、シェルの最大幅は1152pxのまま変えない。Railを`max-content`にして再表示操作に必要な幅だけを残し、空いた領域をArticleへ割り当てる。

Article内部の行長がこのとき広がるが、その値は[記事の読書設計](design-system.md#記事の読書設計)で定める。

## 12 columnsモデル

配置を検討するときは、Atlassian Design Systemにならい、Wideを12、Mediumを6、Compactを2に分割したモデルで考える。本文9・Rail 3のように、領域の比率を決めるための道具として使う。

このモデルはCSSとして実装していない。実際のシェルとカラムは、上記のページシェルと2カラム配置の値で構成する。モデル上の列数を根拠に、実装の幅を導出しない。

## 揃える対象

シェルとカラムへ揃えるもの

- Page heroとsection
- Article、aside、検索結果、filter sidebar
- 同じ階層で横に並ぶ主要領域

揃えないもの

- Button、icon、badge、tag
- Card内部のtitle、description、action
- Dropdown、tooltip、dialogなどのoverlay。Gridの外に浮くため、個別の`max-inline-size`で管理する
- 記事本文中の画像、表、コード、inline要素。これらは[記事の読書設計](design-system.md#記事の読書設計)に従う

## 実装上の標準

- 2次元のページ骨格にはCSS Gridを使う。navigationやtoolbarのような1方向の並びには通常Flexboxを使うが、同じ要件を満たすGridの使用を禁止しない
- 可変幅のtrackには`minmax(0, 1fr)`を使い、長いURLやコードが親を押し広げないようにする。ただしtrackを縮められることと、内容の折り返し・スクロールが成立することは別に確認する
- DOM順を視覚順の基本とする。`grid-auto-flow: dense`やCSSの`order`で、操作できる要素の視覚順だけを変えない

## 期待する結果

- Breakpointの直前と直後で、主要領域と操作が欠落・重複しない
- 320px相当の狭い表示でも、通常の本文を読むためにページ全体の横スクロールを必要としない
- 横に長いコードや表は、その領域の内部でスクロールでき、内容が切り取られず全体へ到達できる
- 目次を開閉したあとも、再表示操作へキーボードで到達でき、フォーカス順が保たれる

## 参考資料

- [Grid — Atlassian Design System](https://atlassian.design/foundations/grid-beta/applying-grid/) - columns / gutters / margins、fixed / fluidの考え方
- [Spacing — Atlassian Design System](https://atlassian.design/foundations/spacing/) - コンテナ内部をspacing tokenで構成する原則
- [CSS Grid Layout — MDN](https://developer.mozilla.org/docs/Web/CSS/CSS_grid_layout) - CSS実装の標準仕様解説

Breakpointの幅、列数、最大幅は、Atlassianの値をそのまま採用したものではない。このブログの構成に合わせて選び直している。

## 関連ファイル

- [デザイン仕様](design-system.md) - デザイン原則とSource of Truth
- [デザインシステムの基盤ページ](../../src/design-system/pages/foundations.astro) - 配置の視覚例（`pnpm dev`の`/design-system/foundations`）
- [BaseLayout.astro](../../src/layouts/BaseLayout.astro) - Page shell
- [記事詳細](../../src/pages/posts/[...slug].astro) - 本文＋目次layoutと目次の開閉
- [SearchPage.astro](../../src/components/pages/SearchPage.astro) - 検索結果＋filter layout
- [PostsPage.astro](../../src/components/pages/PostsPage.astro) - 記事一覧layout
- [HomePage.astro](../../src/components/pages/HomePage.astro) - ホームlayout
