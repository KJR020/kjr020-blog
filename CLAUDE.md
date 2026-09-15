# KJR020's Blog

## Project Overview（WHAT）

Astroで構築した個人ブログ。技術記事の発信とポートフォリオを兼ねる。

### 技術スタック
- **フレームワーク**: Astro + React
- **スタイリング**: Tailwind CSS
- **コード品質**: Biome（Linter/Formatter）
- **テスト**: Vitest + Playwright

詳細は [README.md](README.md) を参照。

## Design Philosophy（WHY）

### コード品質
- コード変更後は必ず `pnpm lint && pnpm test:run && pnpm build` で検証
- 型安全性を重視し、`any` の使用を避ける
- テストは実装と同時に書く

### シンプルさ
- 過度な抽象化を避け、必要最小限の実装を心がける
- 将来の拡張より現在の要件を優先
- ドキュメントは必要な箇所のみに記述

## Directory Structure

```
.
├── content/
│   └── posts/          # ブログ記事（Markdown）
├── e2e/                # Playwright E2Eテスト
├── functions/          # Cloudflare Pages Functions
├── scripts/            # ビルド補助スクリプト
└── src/
    ├── components/     # UIコンポーネント（Astro/React、機能単位でcolocation）
    │   ├── scrapbox/   # Scrapboxのcomponent/hook/type/provider
    │   ├── search/     # 検索UI
    │   ├── theme/      # テーマ切替と初期化
    │   └── toc/        # 目次UIとhook/type
    ├── layouts/        # ページレイアウト
    ├── lib/            # 共有ユーティリティ関数
    ├── pages/          # ルーティング（ファイルベース）
    └── styles/         # グローバルスタイル
```

複数ファイルで構成される機能では、private な component / hook / type / provider を
`components/<feature>/` にcolocationする。

## Commands

```shell
pnpm dev          # 開発サーバー起動
pnpm build        # ビルド
pnpm lint         # Lint実行
pnpm lint:fix     # Lint自動修正
pnpm format       # フォーマット
pnpm test:run     # テスト実行
pnpm typecheck    # 型チェック
```

## Development Guides

- [Pull Request 作成ガイド](docs/development/pull-request-guidelines.md)

## Design System

[KJR020ブログ デザインシステム](docs/blog-design-system.md)を、ブログの視覚言語、UI部品、状態、ページ構造に関する正規仕様として参照する。

### 参照ルール

- UI、レイアウト、スタイル、タイポグラフィ、モーション、UIライティング、アクセシビリティを変更する前に、デザインシステムと対象領域の既存実装を確認する。
- レイアウト変更では[Grid system](docs/grid-system.md)、文言変更では[UIライティングガイドライン](docs/ui-writing-guidelines.md)も参照する。
- 値は`src/styles/globals.css`、部品の構造とvariantは`src/components/`、言葉とレイアウトの原則は`docs/`をSource of Truthとして扱う。
- 新しい値や部品を追加する前に、既存のsemantic token、primitive、ブログパターンで表現できないか確認する。
- `pnpm dev`で開発サーバーを起動し、`/design-system`の標本をライト/ダーク、Desktop/Mobile、主要な操作・データ状態で確認する。

### 更新ルール

- デザインシステムへ記載するのは採用済みの仕様だけとし、改善候補、優先度、移行状況、実装との差分はIssueまたはADRで管理する。
- 仕様を変更する場合は、変更対象のSource of Truth、関連ガイド、`src/design-system/`の標本、実装、テストを同じ変更で更新する。
- Catalog側へCSS値やコンポーネントの見た目を複製せず、実装済みのトークンとコンポーネントから標本を描画する。
- 変更後は`pnpm test:design-system`を実行し、`pnpm build`でデザインシステムが公開成果物へ含まれないことを確認する。

## Spec-Driven Development

機能開発にはKiro-style Spec Driven Developmentを採用。

### クイックリファレンス
- **Steering**: `.kiro/steering/` - プロジェクト全体のルールとコンテキスト
- **Specs**: `.kiro/specs/` - 個別機能の仕様と進捗
- **Architecture**: `docs/architecture/` - 技術設計ドキュメント

### 基本ワークフロー
1. `/kiro:spec-init "description"` - 仕様の初期化
2. `/kiro:spec-requirements {feature}` - 要件定義
3. `/kiro:spec-design {feature}` - 設計
4. `/kiro:spec-tasks {feature}` - タスク分割
5. `/kiro:spec-impl {feature}` - 実装
   - `/kiro:spec-impl-tdd {feature}` - twadaスタイルTDDで実装（オプション）
6. `/kiro:spec-status {feature}` - 進捗確認

### 開発ルール
- 3フェーズ承認: Requirements → Design → Tasks → Implementation
- 各フェーズでレビュー必須（`-y` は意図的なスキップ時のみ）
- 日本語でレスポンス生成

## Architecture Documents
プロジェクト全体の技術方針を定義するドキュメント。常に最新の状態に保つ。

- [Test Architecture](docs/architecture/test_architecture.md) - テスト戦略と方針
