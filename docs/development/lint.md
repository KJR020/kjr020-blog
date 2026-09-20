# 静的チェック

マージ前に通す静的チェックの一覧と、ローカルでの実行方法をまとめる。

## 目的

- 実装と文書の不整合を、レビュー時の手動確認ではなく自動検査で検出する
- ローカルとCIで同じコマンド・同じ設定を使い、実行環境によって結果が変わらないようにする

## 一覧

| コマンド | 内容 | 検査対象 | 設定 | CIジョブ |
| --- | --- | --- | --- | --- |
| `pnpm lint` | Biomeによるリント | `src/`配下の`.ts` `.tsx` `.js` `.jsx` `.astro` | `biome.json` | `lint` |
| `pnpm format:check` | Biomeによる整形チェック | 同上 | `biome.json` | `format` |
| `pnpm typecheck` | TypeScriptの型検査 | `tsconfig.json`の対象 | `tsconfig.json` | `typecheck` |
| `pnpm check:links` | ドキュメントのリポジトリ内リンク検査 | `README.md`、`docs/**/*.md` | `lychee.toml` | `links` |

いずれも`.github/workflows/ci.yml`が各Pull Requestで実行し、失敗するとCIが落ちる。

## Biomeによるリント

[Biome](https://biomejs.dev/)でリントと整形を行う。リンターと整形の設定はどちらも`biome.json`にまとめている。

```bash
pnpm lint      # 検査のみ
pnpm lint:fix  # 自動修正できるものを修正する
```

- ルールは`recommended`を有効にしている
- 検査対象は`src/`配下の`.ts` `.tsx` `.js` `.jsx` `.astro`
- `.gitignore`を参照し、無視対象のファイルは検査しない
- `.astro`ファイルでは次のルールを無効にしている。Astroコンポーネントのフロントマターで誤検知するため
  - `style/useConst`、`style/useImportType`
  - `correctness/noUnusedVariables`、`correctness/noUnusedImports`

## Biomeによる整形

```bash
pnpm format        # 整形する
pnpm format:check  # 整形済みかを検査する(CIはこちらを実行する)
```

整形規則は次のとおり。

- インデントは半角スペース2つ
- 1行の最大幅は100文字
- 文字列はダブルクォート
- セミコロンは常に付ける

## 型検査

```bash
pnpm typecheck
```

`tsc --noEmit`を実行する。Astroが生成する型定義に依存するため、型定義が古い場合は先に同期する。

```bash
pnpm astro sync
```

CIの`typecheck`ジョブも`pnpm astro sync`のあとに型検査を実行している。

## リンク検査

ドキュメントに記載したリポジトリ内リンクの整合性を[lychee](https://github.com/lycheeverse/lychee)で検査する。ファイルの移動・削除や見出しの変更によるリンク切れを、マージ前に検出することを目的とする。リンク切れを避けるためにリンクを減らすのではなく、読者の利便性を保ったまま手動確認の負担を減らす。

### 検査対象

- `README.md`と`docs/**/*.md`に記載されたリンク
- リンク先は`docs/`配下に限定せず、リポジトリ内のファイル、ディレクトリ、画像、実装ファイル、設定ファイルを対象とする
- 同一Markdownファイル・別のMarkdownファイルの見出しアンカー(`#見出し`)
- 相対パスはリンク元の文書を基準に解決する

対象外は次のとおり。

- 外部URLの疎通確認 - 外部サービスの状態で検査結果が変わらないようにするため
- 公開ブログ(ビルド後のサイト)のリンク - リポジトリの変更で生じる参照切れの検出に絞るため

### 実行

lycheeを導入する。

```bash
brew install lychee
```

検査を実行する。

```bash
pnpm check:links
```

リンク切れがある場合は、リンク元のファイルと行番号、参照先が出力され、終了コードが非0になる。

### 検査設定

設定はリポジトリルートの`lychee.toml`にまとめている。

| 設定 | 内容 |
| --- | --- |
| `offline` | 外部URLへアクセスせず、ローカルファイルの参照のみを検査する |
| `include_fragments` | 見出しアンカーの整合性を検査する |
| `exclude_path` | 検査から除外するパス |

CIの`links`ジョブは、文書の変更有無にかかわらず毎回実行する。参照先の実装ファイルや設定ファイルだけが移動・削除された場合も検出するため。lycheeのバージョンは、Actionをコミットハッシュで、lychee本体をバージョン指定で固定している。

## 除外設定の扱い

- 除外は必要なものに限定し、追加する際は理由を設定ファイルのコメントに残す
- 既存の検出結果を隠すための一括除外は行わず、原則として検出された側を修正する
