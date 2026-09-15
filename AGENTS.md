# Repository Guidelines

- [Pull Request 作成ガイド](docs/development/pull-request-guidelines.md)

## Design System

UI、レイアウト、スタイル、タイポグラフィ、モーション、UIライティング、アクセシビリティを変更する前に、[KJR020ブログ デザインシステム](docs/blog-design-system.md)と関連ガイドを参照する。

- レイアウト変更では[Grid system](docs/grid-system.md)、文言変更では[UIライティングガイドライン](docs/ui-writing-guidelines.md)も確認する。
- 値は`src/styles/globals.css`、部品の構造とvariantは`src/components/`、原則は`docs/`をSource of Truthとして扱う。
- 開発サーバーの`/design-system`で、実装と接続された標本をライト/ダーク、Desktop/Mobileで確認する。
- デザインシステムには採用済みの仕様だけを記載し、改善候補、優先度、移行状況はIssueまたはADRで管理する。
- 仕様を変更した場合は、正規の実装、関連ガイド、デザインシステムの標本、テストを同じ変更で更新し、`pnpm test:design-system`を実行する。
