# Workers 運用手順

`kjr020-blog` はWorkerとStatic Assetsを一緒にデプロイする。設定の正は [wrangler.toml](../../wrangler.toml)、配信する静的ファイルは `dist/`、APIの入口は [worker/index.ts](../../worker/index.ts)。

## ローカル確認

`.dev.vars.example` を参考に、リポジトリルートの `.dev.vars` に保管済みの `SCRAPBOX_SID` を設定する。値はコミットしない。

```shell
pnpm build
pnpm exec wrangler dev --port 8788
```

`http://localhost:8788` からページを開く。APIと静的ファイルを同じOriginで確認できる。静的ファイルの変更後は再ビルドする。`pnpm dev` と `pnpm preview` はWorker APIを起動しない。

## Secretとデプロイ権限

- `SCRAPBOX_SID`：Cosenseのセッション情報。WorkerのランタイムSecretとして登録する。
- `CLOUDFLARE_API_TOKEN`：GitHub ActionsからWorkerをデプロイするためのトークン。対象アカウントの `Workers Scripts: Edit` 権限を付け、GitHub Actions Secretに登録する。
- `CLOUDFLARE_ACCOUNT_ID`：対象アカウントのIDをGitHub Actions Secretに登録する。

Worker作成後に、認証済みのWranglerから次を実行し、対話入力で値を渡す。

```shell
pnpm exec wrangler secret put SCRAPBOX_SID
```

ダッシュボードではWorkers & Pages → Worker版 `kjr020-blog` → 設定 → Runtime variables and secrets → プロダクションに、タイプSecret、名前 `SCRAPBOX_SID` で登録してデプロイする。暗号化済みの値は後から読み出せないため、元の値を別途保管する。

## デプロイ

`main` へのpushで [deploy workflow](../../.github/workflows/deploy.yml) がビルド・型チェック・テストを行い、`wrangler deploy` とHTTP smoke testを実行する。PRからの自動Previewデプロイは行わない。

手動デプロイが必要な場合も、同じ確認を行う。

```shell
pnpm build
pnpm typecheck
pnpm test:run
pnpm exec wrangler deploy
```

デプロイ後は本番 `https://kjr020.dev` と `https://kjr020-blog.johnjiro1114.workers.dev` を確認する。CIのsmoke testはSecret非依存の項目なので、Cosense APIの200とJSON配列、画面上のNotesも別途確認する。

## カスタムドメイン

`kjr020.dev` はダッシュボードのWorker → ドメインで管理する。`wrangler.toml` にドメインは定義していない。この運用ではCDトークンにZone権限を追加しない。

変更後はHTTPS、トップ・記事、画像・CSS・JS、検索、404、旧記事リダイレクト、Cosense APIを確認する。`/posts` は307で `/posts/` へ転送される。APIのGETは200、HEADは静的404、POSTは405と `Allow: GET` を返す。

## キャッシュ

静的ファイルはStatic Assetsが配信する。APIはWorker内のCache APIを使い、成功した公開用JSONをデータセンター単位で600秒保存する。ブラウザ向けは300秒。ホスト名が異なればキャッシュも別になる。エラーは保存しない。詳細は [Cosense API Proxy](../architecture/cosense-api-proxy.md) を参照する。

`CF-Cache-Status` だけではWorker内の `caches.default.match` のHIT/MISSを断定しない。実装は診断用ヘッダを公開しておらず、応答時間だけでも判定できない。
