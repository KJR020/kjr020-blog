# 記事検索UIデザイン

記事検索の開き方、検索結果の表示、キーボード操作を定義する。

## 目的

HomeではPosts(最新記事)とNotes(Cosenseのメモ)を主なコンテンツとする。全文検索は、読者が必要なときに開くCommand Paletteとして提供する。Tag一覧はHomeへ常設しない。記事一覧の行と記事詳細のTagは、分類ページへのリンクとして扱う。

## ユースケース

| ID | 読者ができること |
| --- | --- |
| UC_S_1 | 読者がHeaderから記事検索を開ける |
| UC_S_2 | キーワードで記事を検索できる |
| UC_S_3 | 検索結果から記事へ移動できる |
| UC_S_4 | 検索を閉じて元のページへ戻れる |

## タスク

| 読者の操作 | システムの動作 | 関連UC |
| --- | --- | --- |
| HeaderのSearchを押す | Command Paletteを開く。検索入力へフォーカスを移す | UC_S_1 |
| ⌘K / Ctrl Kを押す | 現在のページ上でCommand Paletteを開く | UC_S_1 |
| キーワードを入力する | Pagefindで記事を検索し、上位8件を表示する | UC_S_2 |
| 検索結果を選ぶ | 対象の記事詳細へ移動する | UC_S_3 |
| Escapeを押す、または背景をクリックする | Command Paletteを閉じる。元のページを維持する | UC_S_4 |

## UI構造

```text
[Header]
  Home  Posts  [Search ⌘K]  Cosense
                    │
                    ▼
       ┌──────────────────────────┐
       │  🔍 [記事を検索...]  Esc │
       ├──────────────────────────┤
       │  検索結果1               │
       │  検索結果2               │
       │  ...最大8件              │
       └──────────────────────────┘
```

Command Paletteは、ページのグリッド外に重ねるHTMLの`dialog`要素で実装する。画面幅によらず同じ検索モデルを使う。Compactでは、モバイルメニュー内のSearchから開く。

## 情報構造

```text
Home
├── Profile
├── Posts
└── Notes

Global utility
└── Search(Header / ⌘K / Ctrl K)
    └── 検索結果 → 記事詳細
```

## 決定事項

- Homeへ検索領域を常設しない
- HomeへTag一覧を常設しない
- 記事検索はHeaderとキーボードショートカットから開くCommand Paletteへ一本化する
- 旧`/search`は`/?search=open`へ恒久転送し、同じCommand Paletteを開く
- Pagefindの検索対象は記事詳細だけとする

## コンポーネント

| コンポーネント | 役割 |
| --- | --- |
| `Header.astro` | 水平ナビゲーションに検索ボタンを表示する |
| `MobileMenu.tsx` | モバイルメニューに検索ボタンを表示する |
| `CommandPalette.tsx` | Pagefindの読み込み、検索、結果選択、Command Paletteの開閉を担う |
| `search.astro` | 旧URLをCommand Paletteが開くHomeへ転送する |

## アクセシビリティ

- 検索ボタンは、同一ページ上のCommand Paletteを開く`button`とする
- Command Paletteを開いたら、検索入力へフォーカスを移す
- 入力は`combobox`、結果は`listbox` / `option`で表す
- Arrow Up / Down、Enter、Escapeで主要操作を完了できるようにする
- Command Paletteを閉じた後も閲覧中のページを維持する

## 関連ファイル

- [CommandPalette.tsx](../../src/components/search/CommandPalette.tsx) - 検索と結果選択の実装
- [デザイン仕様](../design/design-system.md) - 検索と基本導線の位置づけ
- [UIライティングガイドライン](../design/ui-writing-guidelines.md) - 入力と状態メッセージの書き方
