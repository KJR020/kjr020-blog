# Repository Guidelines

## Communication

- 日本語で応答する。

## Project

- Astro + Reactで構築し、Cloudflare Workersへデプロイする個人ブログ。
- パッケージマネージャーはpnpmを使用する。

## Project References

- 構成や技術判断は[Architecture Documents](docs/architecture/README.md)を参照する。
- Pull Requestは[Pull Request 作成ガイド](docs/development/pull-request-guidelines.md)に従う。
- UI、レイアウト、スタイル、タイポグラフィ、モーション、UIライティング、アクセシビリティを変更する場合は、[デザイン仕様](docs/design/design-system.md)を参照する。
- レイアウト変更では[Grid system](docs/design/grid-system.md)、文言変更では[UIライティングガイドライン](docs/design/ui-writing-guidelines.md)も参照する。

## Git Workflow

- ブランチ名は`<type>/<short-description>`形式にし、変更の目的に応じて`feat`、`fix`、`refactor`、`chore`、`docs`、`test`などの意味的なtypeを選ぶ。
- AIツール名や担当者名ではなく、変更内容が分かる英語のkebab-caseを使う。
