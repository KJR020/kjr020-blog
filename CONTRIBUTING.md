# 開発ガイド

## 開発環境

- Node.js 22.x
- pnpm 11.x

依存関係をインストールします。

```shell
pnpm install
```

## 検証

変更内容に応じて、次のコマンドを実行してください。

```shell
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:run
pnpm build
```

UIを変更した場合は、デザインシステムとPlaywrightのテストも確認します。

```shell
pnpm test:design-system
pnpm test:e2e
```

## プルリクエスト

変更の目的、影響、検証結果を本文に記載してください。詳細は[プルリクエスト作成ガイド](docs/development/pull-request-guidelines.md)を参照してください。

UI、レイアウト、スタイル、文言を変更する場合は、[デザインシステム](docs/blog-design-system.md)と関連ガイドも更新してください。
