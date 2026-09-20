# 記事検索UIデザイン

記事検索をHomeの常設コンテンツではなく、必要なときだけ呼び出すグローバルユーティリティとして提供する。

## 目的

Homeの主役をLatest PostsとScrapboxに絞りながら、過去記事を探したい読者には全文検索を残す。Tag一覧はHomeへ常設せず、記事カードと記事詳細の分類リンクとして扱う。

## ユースケース

| ID | ユースケース記述 |
|:---|:----------------|
| UC_S_1 | 読者が Headerから記事検索を開ける |
| UC_S_2 | 読者が キーワードで記事を検索できる |
| UC_S_3 | 読者が 検索結果から記事へ移動できる |
| UC_S_4 | 読者が 検索を閉じて元のページへ戻れる |

## タスク

| ユーザー(アクション) | システム(働き) | 関連UC |
|:----------------------|:----------------|:-------|
| HeaderのSearchを押す | Command Paletteを開いて入力へfocusする | UC_S_1 |
| ⌘K / Ctrl Kを押す | 現在のページ上でCommand Paletteを開く | UC_S_1 |
| キーワードを入力する | Pagefindで記事を検索し、上位8件を表示する | UC_S_2 |
| 検索結果を選ぶ | 対象の記事詳細へ移動する | UC_S_3 |
| Escapeまたは背景を押す | dialogを閉じ、元のページを維持する | UC_S_4 |

## UI構造

```text
[Header]
  Home  Posts  [Search ⌘K]  Scrapbox
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

Command PaletteはページGridの外へ浮くnative dialogとする。DesktopとMobileで同じ検索モデルを使い、MobileではMenu内のSearchから開く。

## 情報構造

```text
Home
├── Profile
├── Latest Posts
└── Scrapbox

Global utility
└── Search(Header / ⌘K / Ctrl K)
    └── 検索結果 → 記事詳細
```

## 決定事項

1. HomeへSearch sectionを常設しない。
2. HomeへTag一覧を常設しない。
3. 記事検索はHeaderとキーボードショートカットから開くCommand Paletteへ一本化する。
4. 旧`/search`は`/?search=open`へ恒久転送し、同じCommand Paletteを開く。
5. Pagefindの検索対象は記事詳細だけとする。

## コンポーネント

| コンポーネント | 役割 |
|:--------------|:-----|
| `Header.astro` | DesktopのSearch triggerを表示する |
| `MobileMenu.tsx` | MobileのSearch triggerを表示する |
| `CommandPalette.tsx` | Pagefindの読み込み、検索、結果選択、dialog操作を担う |
| `search.astro` | 旧URLをCommand Paletteが開くHomeへ転送する |

## アクセシビリティ

- Search triggerはリンクではなく、同一ページ上のdialogを開く`button`とする
- dialogを開いたら検索入力へfocusする
- 入力は`combobox`、結果は`listbox` / `option`で表す
- Arrow Up / Down、Enter、Escapeで主要操作を完了できるようにする
- dialogを閉じた後も閲覧中のページを維持する
