# KJR020's Blogページレイアウト

ページ横方向の配置を決める仕様。ページシェルの幅、余白、主要領域の並べ方を扱う。

## 目的

読者が主要な情報を見つけ、読み進められるように、ページの骨格を揃える。

横方向の配置は3層で決める。

| 層 | 決めること | 正本 |
| --- | --- | --- |
| ページシェル | 外側の最大幅と左右余白 | この文書 |
| ページパターン | 主領域と補助領域の配置 | この文書 |
| 記事内部 | Article内の幅、行長、コード・表・図の表示 | [記事の読書設計](design-system.md#記事の読書設計) |

Wideではシェルを16列へ分割し、主要領域の幅と位置をその列で決める。列はページ間で配置を揃えるための座標系であり、CSS Gridの使用そのものを要件にはしない。

トップレベル領域の幅と位置をこの文書で決め、ボタン、アイコン、カード内部などの小さな要素はspacing tokenで整える。

## 16列グリッド

Wideでは、シェルの内容幅を16列とgutterへ分割する。

| 項目 | 値 |
| --- | ---: |
| 列数 | 16 |
| gutter | `--grid-gutter`(16〜24px、画面幅で補間) |
| シェル内容幅1200px・gutter 24pxのとき1列 | 52.5px |

n列ぶんの幅は次の式で求める。

```
n列span   = n × W / 16 + gutter × (n / 16 - 1)
空ける量  = (1 - n / 16) × (W + gutter)
```

1200px・gutter 24pxのとき、12列は894px、4列は282pxになる。

### 実装手段は配置の必要に応じて選ぶ

CSS Gridを使うのは、複数の領域が同じ行で異なる列を占めるときとする。単一の領域が連続した列を占めるだけの場合は、同じ配置結果をより単純なCSSで実現してよい。

| ページ | 構成 | 実装 |
| --- | --- | --- |
| 記事詳細 | 本文12列 + 目次4列 | CSS Grid(`.grid-16`) |
| ホーム | 記事一覧11列 + 空き1列 + メモ4列 | CSS Grid(`.grid-16`) |
| 記事一覧 | 年3列 + 空き1列 + 記事12列 | CSS Grid(`.grid-16`) |
| タグ別一覧、Privacy Policy | 主領域だけ | CSS Grid(`.grid-16`)で左端から配置する |
| ヒーロー、ページ見出し | シェル全幅 | Gridを使わない |

手段が異なっても、同じviewport条件で配置の基準線が一致することを確認する。

## 要件

配置を変更したあとも、次を満たす

- 主要領域と操作が欠落・重複しない。Breakpointの直前と直後でも同じとする
- 長い見出し、URL、コード、表を含んでも、通常の本文を読むためにページ全体の横スクロールを必要としない。320px相当の狭い表示でも同じとする
- 横幅が必要な内容は、対応する領域の内部で全体へ到達できる。`overflow: hidden`で切り取って解決しない
- 読み順とフォーカス順が、情報の関係と操作の流れを保つ。視覚配置だけの変更で順序の意味を変えない
  - CompactとMediumでは、目次を閉じたあとも、開く操作へキーボードで到達できる
- 隣接する独立した領域の間に、区切りとして機能する余白を保つ

要件は変更後の判定基準とし、デザイン仕様の更新フローで確認する。以下の標準仕様は、要件を満たすために現在採用している値であり、変更管理の対象とする。

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

すべてのページで、同じシェル(`.shell`)を使う。最大幅と左右の内側余白はここだけで決める。

| 項目 | 値 |
| --- | --- |
| 最大幅 | 1280px(`--shell-max`)。左右の内側余白を含む |
| 左右の内側余白 | `--shell-pad`。16pxから40pxまで画面幅で補間する |

ページごとに最大幅を変えない。長文だけのページ(Privacy Policy)は、シェルの幅を変えずに主領域の列数と`max-inline-size`で行長を抑える。

### 内側余白を画面幅で変える理由

16px固定では、Wideで画面端に文字が寄りすぎ、大きな見出しに対して窮屈に見える。狭い画面では内容幅を優先して16pxを保ち、広い画面ほど余白を広げる。

### シェルを1種類にする理由

ページごとに最大幅を使い分けると、Headerと本文の左端が揃わないページが生じる。すべてのページで同じ左端を共有すると、ページ間を移動したときに視線の基準線が動かない。

## 2カラム配置

Wideでは主領域と補助領域を横に並べる。どちらも列で幅を決める。

| ページ | 主領域 | 補助領域 |
| --- | --- | --- |
| 記事詳細 | 本文1〜12列 | 目次13〜16列 |
| ホーム | 記事一覧1〜11列 | メモ13〜16列 |

CompactとMediumでは1カラムへ戻す。記事詳細では目次を記事ヘッダーの直後へ、ホームではメモを記事一覧の下へ置く。

補助領域は常に右4列とする。補助情報を持たないページでは、その4列を余白として残してよい。「右4列は補助情報を置く場所」とは定めない。

### 主領域と補助領域を離す

列間のgutterだけでは、2つの内容が近づきすぎる。ホームでは記事一覧を11列に留め、12列目を空けて距離を取る。記事詳細では本文の行長がReading laneで抑えられるため、12列のままでも目次との間に十分な余白が残る。

### 記事ヘッダー

Wideでは記事ヘッダーも同じ16列に乗せ、タイトルとメタ情報を1〜12列へ置く。

装飾のために主領域の幅を削らない。タイトルとメタ情報には本文と同じ12列を確保する。

## 揃える対象

シェルとカラムへ揃えるもの

- Page heroとsection
- Article、aside
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

## 参考資料

- [Grid — Atlassian Design System](https://atlassian.design/foundations/grid-beta/applying-grid/) - columns / gutters / marginsの考え方
- [Spacing — Atlassian Design System](https://atlassian.design/foundations/spacing/) - コンテナ内部をspacing tokenで構成する原則
- [CSS Grid Layout — MDN](https://developer.mozilla.org/docs/Web/CSS/CSS_grid_layout) - CSS実装の標準仕様解説

## 関連ファイル

- [16列のページレイアウト採用](../architecture/adr/0002-adopt-sixteen-column-layout.md) - 列数の比較と実装手段の選定経緯
- [デザイン仕様](design-system.md) - デザイン原則とSource of Truth
- [デザインシステムの基盤ページ](../../src/design-system/pages/foundations.astro) - 配置の視覚例(`pnpm dev`の`/design-system/foundations`)
- [BaseLayout.astro](../../src/layouts/BaseLayout.astro) - Page shell
- [記事詳細](../../src/pages/posts/[...slug].astro) - 本文と目次の配置、CompactとMediumの目次開閉
- [CommandPalette.tsx](../../src/components/search/CommandPalette.tsx) - Grid外の検索UI
- [PostsPage.astro](../../src/components/pages/PostsPage.astro) - 記事一覧layout
- [HomePage.astro](../../src/components/pages/HomePage.astro) - ホームlayout
