# Repository Guidelines

## Communication

- 日本語で応答する。

## Project

- Astro + Reactで構築し、Cloudflare Workersへデプロイする個人ブログ。
- パッケージマネージャーはpnpmを使用する。

## Project References

- 構成や技術判断は[Architecture Documents](docs/architecture/README.md)を参照する。
- Pull Requestは[Pull Request 作成ガイド](docs/development/pull-request-guidelines.md)に従う。
- `docs/`配下の文書を書く場合は[ドキュメント執筆ガイドライン](docs/development/documentation-guidelines.md)に従う。
- UI、レイアウト、スタイル、タイポグラフィ、モーション、UIライティング、アクセシビリティを変更する場合は、[デザイン仕様](docs/design/design-system.md)を参照する。
- レイアウト変更では[Grid system](docs/design/grid-system.md)、文言変更では[UIライティングガイドライン](docs/design/ui-writing-guidelines.md)も参照する。

## Design Changes

- デザインシステムでは、[デザイン仕様の運用](docs/design/design-system.md#運用)に定めた実装者として作業する。
- [変更管理](docs/design/design-system.md#変更管理)でプロダクトオーナーの承認が必要とされる変更は、実装する前に変更理由と適用範囲を示して確認する。
- 仕様で判断できない点は、推測で実装せずに確認する。
- 既存のコードの値や書き方を、仕様の根拠にしない。
- 仕様とコードの不一致を見つけたら、どちらを直すかを確認してから変更する。
- 自動化していない確認の結果は、Pull Requestに記録する。

## Git Workflow

- ブランチ名は`<type>/<short-description>`形式にし、変更の目的に応じて`feat`、`fix`、`refactor`、`chore`、`docs`、`test`、`design`などの意味的なtypeを選ぶ。
- AIツール名や担当者名ではなく、変更内容が分かる英語のkebab-caseを使う。
