# Cloudflare Workers運用手順

Cloudflare Workersへのデプロイと、配信・APIの確認手順を定義する。

デプロイ先は`kjr020-blog`とする。Cosense API Proxyと`dist/`の静的ファイルを一緒にデプロイする。設定の正本は[Wrangler設定](../../wrangler.toml)、APIの入口は[Workerのエントリーポイント](../../worker/index.ts)とする。

## ローカル確認

`.dev.vars.example`を参考に、リポジトリルートの`.dev.vars`に保管済みの`SCRAPBOX_SID`を設定する。値はコミットしない。

```shell
pnpm build
pnpm exec wrangler dev --port 8788
```

`http://localhost:8788`からページを開く。APIと静的ファイルを同じOriginで確認できる。静的ファイルの変更後は再ビルドする。`pnpm dev`と`pnpm preview`はCosense API Proxyを起動しない。

## Secretとデプロイ権限

- `SCRAPBOX_SID`: Cosenseのセッション情報。Cloudflare WorkersのランタイムSecretとして登録する
- `CLOUDFLARE_API_TOKEN`: GitHub ActionsからCloudflare Workersへデプロイするためのトークン。対象アカウントの`Workers Scripts: Edit`権限を付け、GitHub Actions Secretに登録する
- `CLOUDFLARE_ACCOUNT_ID`: 対象アカウントのIDをGitHub Actions Secretに登録する

Cloudflare Workers上に`kjr020-blog`を作成した後に、認証済みのWranglerから次を実行し、対話入力で値を渡す。

```shell
pnpm exec wrangler secret put SCRAPBOX_SID
```

ダッシュボードから登録する場合は、次の手順を使う。

1. Workers & Pages → `kjr020-blog`(Cloudflare Workers) → 設定 → Runtime variables and secrets → プロダクションを開く
2. タイプをSecret、名前を`SCRAPBOX_SID`として、値を登録する
3. 登録した設定をデプロイする

暗号化済みの値は後から読み出せない。元の値は別途保管する。

## デプロイ

`main`へのpushで[Deploy workflow](../../.github/workflows/deploy.yml)がビルド、型検査、テストを実行する。検査の成功後、`wrangler deploy`でデプロイする。デプロイ後はHTTPの疎通確認を実行する。Pull Requestからの自動Previewデプロイは行わない。

手動デプロイが必要な場合も、同じ確認を行う。

```shell
pnpm build
pnpm typecheck
pnpm test:run
pnpm exec wrangler deploy
```

デプロイ後は、本番サイト`https://kjr020.dev`とworkers.devの`https://kjr020-blog.johnjiro1114.workers.dev`を確認する。

- CIの疎通確認が成功したことを確認する
- Cosense APIが200とJSON配列を返すことを確認する
- 画面上のNotesを確認する

CIの疎通確認はSecretに依存しない項目だけを検査する。Cosense APIとNotesは別途確認する。

## カスタムドメイン

`kjr020.dev`はダッシュボードのWorkers & Pages → `kjr020-blog` → ドメインで管理する。`wrangler.toml`にドメインは定義していない。この運用ではCDトークンにZone権限を追加しない。

ドメインの変更後は、次を確認する。

- HTTPSで接続できる
- ホームと記事を表示できる
- 画像、CSS、JavaScriptを取得できる
- 検索を利用できる
- 存在しないページには404を表示する
- 旧記事URLからリダイレクトできる
- `/posts`は307で`/posts/`へ転送する
- Cosense APIのGETは200を返す
- Cosense APIのHEADは静的404を返す
- Cosense APIのPOSTは405と`Allow: GET`を返す

## キャッシュ

静的ファイルはStatic Assetsが配信する。Cosense API ProxyはCloudflare Cache APIを使う。成功した公開用JSONは、データセンター単位で600秒保存する。ブラウザ向けのキャッシュ期間は300秒とする。ホスト名が異なる場合は、別のキャッシュを使う。エラーレスポンスは保存しない。詳細は[Cosense API Proxy](../architecture/cosense-api-proxy.md)を参照する。

`CF-Cache-Status`だけではCosense API Proxy内の`caches.default.match`のHIT/MISSを断定しない。実装は診断用ヘッダーを公開していない。応答時間だけでもHIT/MISSを判定できない。

## 関連ファイル

- [Wrangler設定](../../wrangler.toml) - デプロイ先とStatic Assetsの配信設定
- [Deploy workflow](../../.github/workflows/deploy.yml) - デプロイと疎通確認
- [Cosense API Proxy](../architecture/cosense-api-proxy.md) - APIの入力、応答、キャッシュ仕様
