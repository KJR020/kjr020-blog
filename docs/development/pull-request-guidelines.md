# Pull Request 作成ガイド

## 言語

- PRのタイトルと本文は日本語で記述する。
- コマンド、ファイルパス、識別子などは原文の表記を維持する。

## ブランチ名

ブランチ名は、変更の種類が分かるSemantic Branch Names形式にする。

```text
<type>/<short-description>
```

- `type`には`feat`、`fix`、`docs`、`refactor`、`test`、`chore`のいずれかを使用する。
- `short-description`は変更内容を表す英語のkebab-caseにする。
- `main`へ直接コミットせず、変更内容に対応するブランチからPRを作成する。

例: `feat/home-search`、`fix/rss-published-date`、`docs/development-setup`

## タイトル

変更の目的が分かる簡潔なタイトルにする。

例: `コンポーネントを機能単位で整理`

## 本文

変更内容に応じて、次の情報を記載する。

- 変更内容
- 変更理由
- 利用者・開発者への影響
- 検証内容と結果
- 既知の制約や未対応事項

レビュー準備が完了していない場合はDraft PRとして作成する。
