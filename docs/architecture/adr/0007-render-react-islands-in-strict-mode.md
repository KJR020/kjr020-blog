# React IslandsをStrict Modeで描画する

React Islandsと単体テストのReactを、Strict Modeで描画する判断を記録する。

## 決定

- React Islandsとして読み込む部品は、`withStrictMode`で包んだものをexportする
  - Astroが描画するのは包んだ部品で、`<StrictMode>`はその内側に入る
- 単体テストは、`tests/setup.ts`でTesting Libraryの`reactStrictMode`を有効にする
  - Testing Libraryは、Reactのルートに渡す要素を`<StrictMode>`で包む

Strict Modeは開発時だけ検査する。本番ビルドの`<StrictMode>`は検査を行わず、中身をそのまま描画する。

## 背景

Reactは、部品の描画が純粋であることを前提に、描画を何回呼ぶか、結果を使うかを自分で決める。effectは、開始と停止を対にして書くことが前提である。

Strict Modeは開発時に、描画を追加で実行して純粋でない描画を見つけやすくする。また、effectの開始と停止を追加で実行し、停止の書き漏れを見つけやすくする。ただし、Strict ModeをReactのルートより内側で有効にした場合、初回マウントのeffectは追加実行しない。React公式の文書は、本番で起こりえない「子のeffectだけが二重に走る」状態を避けるため、と説明している。

Astroの`@astrojs/react`には、Strict Modeを有効にする設定がない。アイランドの描画は、Astroが`createElement(Component, props)`をReactのルートへ渡して始まる。そのため、部品の側で包むか、Astroの描画処理を変えるかのどちらかになる。

アイランドがStrict Modeの検査を受ける範囲は、Reactのルートの作り方で次のように変わる。表はReact 19.2.3で、ルートで包む方法と部品で包む方法の両方を実測した結果である。

| アイランド | ルートの作り方 | 描画の追加実行 | 初回マウントのeffect | 後から加わった部品のeffect |
| --- | --- | --- | --- | --- |
| `client:load` | `hydrateRoot` | あり | 追加実行なし | 追加実行あり |
| `client:only` | `createRoot` | あり | ルートで包んだ場合だけ追加実行 | 追加実行あり |

- `client:only`の初回マウントの違いは、React公式の文書が説明する、ルートより内側で有効にした場合の挙動である
- `hydrateRoot`では、ルートで包んでも初回マウントのeffectが追加実行されなかった。React公式の文書には記載がなく、React 19.2.3の実装による挙動である。Reactの更新で変わる可能性がある

## 比較した方針

- `@astrojs/react`の描画処理へ`pnpm patch`を当て、ルートで`<StrictMode>`に包む案は採用しなかった
  - 部品で包む方法より多く検査できるのは、`client:only`のアイランドが初回マウントするときのeffectだけである。`client:load`のアイランドは、ハイドレーションのため、どちらの方法でも初回マウントのeffectが追加実行されない
  - その差に対して、依存ライブラリの内部実装へのパッチを、版を更新するたびに当て直す負担が大きい
- 単体テストだけでStrict Modeを有効にする案は採用しなかった
  - 開発サーバーでブラウザに表示した部品の描画が検査されない。テストが再現しない操作の順序や、ブラウザAPIとの組み合わせで起きる不純な描画を見つけられない

## 結果と制約

- ブラウザでは、アイランドの初回マウントのeffectは追加実行されない。この検査は、`createRoot`で描画する単体テストが担う
- 新しいアイランドを追加するときは、部品を`withStrictMode`で包んでexportする。包み忘れても動作は変わらないため、Strict Modeの検査だけが抜ける
- 単体テストでは、effectが開始・停止・開始と走る。外部のオブジェクトを作るeffectを検証するときは、停止していないものを取り出して検証する
- `@astrojs/react`を更新するときは、Strict Modeを有効にする設定が加わっていないかを確かめる。設定が加わっていれば、`withStrictMode`ではなくその設定を使う
- Reactを更新するときは、`hydrateRoot`で初回マウントのeffectが追加実行されるようになっていないかを確かめる。追加実行されるなら、ルートで包む方法と比べ直す

## 関連ファイル

- [withStrictMode](../../../src/components/withStrictMode.tsx) - アイランドをStrict Modeで包む関数
- [Vitest共通セットアップ](../../../tests/setup.ts) - 単体テストでのStrict Mode
- [アーキテクチャ概要](../overview.md) - React Islandsの範囲

## 参考資料

- [StrictMode](https://react.dev/reference/react/StrictMode) - Strict Modeが開発時に行う検査と、アプリの一部で有効にした場合の違い
- [Keeping Components Pure](https://react.dev/learn/keeping-components-pure) - 描画を純粋に保つ理由
