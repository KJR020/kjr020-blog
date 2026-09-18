# リポジトリ構成

KJR020's Blogのプロジェクト境界と、各ディレクトリの恒久的な責務を定義する。

## 設計原則

- リポジトリルートをAstro／Cloudflare Pagesのプロジェクトルートとする。
- プロダクトコード、公開コンテンツ、開発支援を責務ごとに分離する。
- プロジェクト全体へ作用する設定は、各ツールが標準探索できるルートに置く。
- ディレクトリ階層は、独立した実行・デプロイ単位が増えた場合にだけ追加する。

## ディレクトリ構成

```text
.
├── .github/
│   ├── workflows/
│   └── dependabot.yml
├── content/
│   └── posts/
├── docs/
│   ├── architecture/
│   ├── development/
│   └── security/
├── functions/
│   ├── _lib/
│   ├── api/
│   └── tsconfig.json
├── public/
├── scripts/
├── src/
├── tests/
│   └── e2e/
├── AGENTS.md
├── CLAUDE.md
├── astro.config.mjs
├── biome.json
├── package.json
├── playwright.config.ts
├── playwright.design-system.config.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── vitest.config.ts
└── wrangler.jsonc
```

分類のためだけの空ディレクトリは作らない。

## ディレクトリの責務

| パス | 責務 | 配置しないもの |
| --- | --- | --- |
| `src/` | Astro、React、スタイル、アプリケーションロジック | E2E、運用文書、Cloudflare Functions |
| `content/posts/` | 公開記事と記事固有の素材 | 設計資料、開発用テンプレート |
| `public/` | 加工せず公開する静的ファイル | ソースとして変換するアセット |
| `functions/` | Cloudflare Pages Functionsとサーバー側ロジック | ブラウザへ配信するコード |
| `tests/e2e/` | Playwright E2EとVisual Regression | Unit／Componentテスト |
| `scripts/` | ビルド、検査、生成に使うプロジェクト固有スクリプト | アプリケーションの実行時ロジック |
| `docs/` | 現在有効なアーキテクチャ、開発、セキュリティ文書 | 移行手順、一時的な作業メモ |

Unit／Component／Functionsテストは、対象実装との対応を明確にするため実装ファイルの近くへ置く。複数の実行領域を横断するE2Eだけを`tests/e2e/`へ集約する。

## プロジェクト境界

このリポジトリで独立して実行・デプロイするアプリケーションは1つである。`apps/web/`のような階層は設けず、リポジトリルートをAstroとCloudflare Pagesのプロジェクトルートとして扱う。

ルートの設定ファイルは、プロジェクト全体に作用するツールの入口である。設定ファイル数を減らすためだけに`config/`へ移動しない。

| 分類 | ファイル | 役割 |
| --- | --- | --- |
| アプリケーション | `astro.config.mjs`、`tsconfig.json` | AstroとTypeScriptのプロジェクト設定 |
| コード品質 | `biome.json` | lintとformatの共通設定 |
| テスト | `vitest.config.ts`、`playwright*.config.ts` | Unit／Component／E2Eの実行設定 |
| Cloudflare | `wrangler.jsonc` | Pagesのビルド出力と実行設定 |
| パッケージ管理 | `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml` | コマンド、依存関係、pnpmのルート設定 |
| AIツール | `AGENTS.md`、`CLAUDE.md` | 共通のプロジェクト案内とClaude Codeの入口 |

`pnpm-workspace.yaml`はpnpmのルート設定として使用する。複数packageを持つことは意味しない。

Cloudflare Pages Functionsの`functions/`、Wrangler設定、ローカル変数は同じプロジェクト境界に置く。TerraformやDNSなど、アプリケーションの実行設定とは独立したインフラコードが生まれた場合にだけ`infra/`を導入する。

## 構成を再検討する条件

次のいずれかが発生した場合、`apps/`／`packages/`を使うworkspace構成を再検討する。

- 独立して起動・デプロイする2つ目のアプリケーションが追加される
- Webアプリとは異なるruntimeを持つAPIや管理画面が追加される
- 複数アプリケーションから利用する共有UI、型、設定packageが必要になる
- CIや依存関係をpackage単位で分離する必要が生じる

ルート設定ファイルが多いことだけを、階層追加の理由にはしない。

## 関連ファイル

- [アーキテクチャ概要](overview.md) - ビルド、ブラウザ、外部サービスの境界
- [Test Architecture](test_architecture.md) - テスト種別と配置方針
- [Astro設定](../../astro.config.mjs) - AstroとIntegrationの設定
- [Biome設定](../../biome.json) - lint／format設定
