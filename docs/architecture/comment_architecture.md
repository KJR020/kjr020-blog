# コメント機能: Giscus採用(意思決定ログ)

## 概要

Astro製技術ブログにコメント機能を導入するにあたり、GitHub Discussionsベースのコメントシステム「Giscus」を採用した。

## 前提・制約

- GitHub Pages + Astro(SSG)でホスティング、サーバー常設なし
- 全記事にコメント欄を付ける
- できればGitHub認証
- 無料〜低コスト
- 技術ブログなのでMarkdown / コード貼り付けが重要

## 選択肢

| サービス | 種別 | 認証方式 |
|----------|------|----------|
| **Giscus** | GitHub Discussions | GitHub |
| Utterances | GitHub Issues | GitHub |
| Disqus | SaaS | SNS/メール |
| Cusdis | セルフホスト/SaaS | 匿名可 |
| Remark42 | セルフホスト | 複数対応 |
| Commento/Comentario | セルフホスト | 複数対応 |
| Isso | セルフホスト | 匿名 |
| Hyvor Talk | SaaS | 複数対応 |

## 観点別の結論

### 1. 運用コスト

- **Giscus**: GitHub上(Discussions)に保存＝追加コストほぼ0、サーバー運用なし
- 自前ホスト系(Remark42/Comentario/Isso)は運用・監視・アップデートが発生
- SaaS(Disqus/Hyvor)は継続課金や広告/データ面のトレードオフ

### 2. GitHub Pages / Astro適合

- **Giscus**: 埋め込みのみで完結(静的サイトで成立)
- 自前ホスト系は別途ホスト先が必要(GitHub Pages単体では完結しない)

### 3. コメントしやすさ(技術ブログ適性)

- **Giscus**: GitHubログインで投稿、Markdown(コードブロック含む)前提で相性が良い
- CusdisはMarkdown弱め/なしになりがちで技術ブログ用途とミスマッチ

### 4. プライバシー・データ所有

- **Giscus**: データは自分のGitHubリポジトリ(Discussions)に保存＝所有/移行の筋が良い
- Disqusはトラッキング/広告等の懸念が大きい

### 5. スパム耐性 / モデレーション

- **Giscus**: GitHubアカウント必須でスパムが入りにくい。削除・ロック等もGitHub側で管理可能
- 匿名投稿系(Cusdis/Isso等)はスパム対策を別途考える必要が出やすい

### 6. カスタマイズ(ダークモード等)

- **Giscus**: テーマ設定があり、ブログ側のダークモード連動もしやすい
- Disqusは自由度や一体感の面で妥協が必要になりがち

## 反証条件(Giscusをやめる条件)

以下の条件に当てはまる場合、Giscus以外の選択肢を再検討する：

1. 「GitHubアカウント必須」が読者層に合わず、コメント率が明確に下がる
2. GitHub Discussions運用がリポジトリ管理上の負担になる
3. 匿名コメントや他SNSログインが必須要件に変わる

## 採用決定

GitHub Pages + 技術ブログ + 低コスト + GitHub認証という要件に最も整合するため **Giscusを採用**。

## 実装詳細

- **パッケージ**: `@giscus/react` v3.1.0
- **設定管理**: 環境変数(`.env`)で`PUBLIC_GISCUS_*`として管理
- **テーマ連動**: MutationObserverでサイトのダークモード切り替えを検知し、Giscusテーマを動的に切り替え
- **マッピング**: `pathname`方式で記事URLとDiscussionを紐づけ

## 参考リンク

- [Giscus公式](https://giscus.app)
- [@giscus/react - npm](https://www.npmjs.com/package/@giscus/react)
- [GitHub Discussions](https://docs.github.com/en/discussions)
