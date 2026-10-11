# Cosenseキャッシュの検証

Cosense API Proxyの有効期間と再取得を、WorkerのCache API、ブラウザHTTPキャッシュ、React Queryの順に確認する手順を定義する。
維持する仕様は[Cosense API Proxy](../architecture/cosense-api-proxy.md#キャッシュ)を参照する。

## ローカルで検証する

検証は本番のWorkerとブラウザのデータ取得コードを使う。MiniflareでCache APIを実行し、ChromiumでHTTPキャッシュとReact Queryを確認する。上流のCosense APIと静的ファイルの配信だけをfixtureに置き換える。外部への通信やSecretは必要ない。

```shell
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:cache
```

通常の検証は、成功レスポンスへ保存時の`Age`を付け、残り有効期間を短くして実行する。TTLの設定値を変更せずに、期限切れ後のMISS、上流エラー、復旧後の再取得を確認する。ブラウザの時計を進める操作はReact Queryだけに使い、ブラウザHTTPキャッシュの期限切れは実時間で確認する。

保存時の`Age`をゼロにして、仕様の有効期間が実時間で経過することも確認する。

```shell
pnpm test:cache:full
```

`test:cache:full`は通常の検証に加え、ブラウザHTTPキャッシュの有効期間を過ぎた後の共有キャッシュHITと、共有キャッシュの期限切れ後の再取得を確認する。実行には10分以上かかる。CIでは通常の検証だけを実行する。

## 観測結果を読む

検証スクリプトは各観測をJSONで出力し、期待した挙動と異なる場合は失敗する。

- `elapsedSeconds`は検証開始からの実経過時間。実時間検証の保存直後の行と後続の行との差で、保存後の経過時間を求める
- `generation`は上流応答の世代。上流を更新した後もHITでは保存済みの世代を返し、期限切れ後のMISSでは新しい世代を返す
- `upstreamCalls`は上流の呼び出し回数。HIT/MISSはこの値と返却された世代で判断する
- `cacheControl`、`age`、`date`は返却されたヘッダー。未付与の場合は`null`になる
- ブラウザ検証の`initialRequests`や`freshRequests`は、HTTPキャッシュを通過してWorkerへ届いたAPIリクエストの回数

fixtureの上流呼び出し回数とWorkerへのリクエスト回数は、検証専用の観測点である。本番のレスポンスには追加しない。

## Cloudflare上で検証する

ローカルの成功だけで、Cloudflare CDNの挙動も確認済みとは判断しない。MiniflareはHIT時の`Age`を経過時間に応じて増やさず、保存済みの値を返す。Cloudflare上では`Age`と`Date`の付与・更新を別途確認する。

1. 本番と分離した検証用Workerに、同じAPIコード、固定の上流応答、上流呼び出し回数を観測できる入口を用意する
2. 同一ホスト・同一キャッシュキーで保存直後、有効期間内、期限切れ後に取得する
3. 保存要求の完了時刻、観測時刻、経過秒数、応答の世代、上流呼び出し回数、`Cache-Control`、`Age`、`Date`を記録する
4. データセンターを記録し、異なるデータセンターのMISSを期限切れと区別する
5. 同じオリジンのブラウザから取得し、HTTPキャッシュの再利用とReact Queryの再取得を確認する
6. 期限切れ時に上流を失敗させ、古い共有キャッシュを返さないことと、エラーの`no-store`を確認する

`workers.dev`は現行構成では本番と同じWorkerを指す。独立した検証環境として扱わない。検証用の入口を本番に公開せず、実際の`SCRAPBOX_SID`や認証Cookieを記録しない。

TTLは再利用できる有効期間であり、その期間中の保存維持を保証するものではない。期限前の退避によるMISSは、期限切れ制御の不具合と区別する。React Queryの`staleTime`は更新周期ではなく、画面を開いたままの状態で自動更新を保証しない。

実測値と判断の根拠は対応IssueまたはPRへ記録する。手順書に実行ごとの結果を追記しない。

## 関連ファイル

- [verify-cosense-cache.ts](../../scripts/verify-cosense-cache.ts) - Workerとブラウザを起動し、期限切れと再取得を検証する
- [cache-lifetime.ts](../../tests/worker/fixtures/cache-lifetime.ts) - 保存完了の待機、経過したキャッシュの準備、Workerへのリクエスト数を観測する入口
- [cache-lifetime.tsx](../../tests/src/components/scrapbox/fixtures/cache-lifetime.tsx) - 本番のQueryProviderとデータ取得hookを使うブラウザfixture
- [Cloudflare Workers運用手順](workers-operations.md) - 本番のSecretとデプロイの運用

## 参考資料

- [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [MiniflareのCache API](https://developers.cloudflare.com/workers/testing/miniflare/storage/cache/)
