# Scrapbox API Proxy 手動検証チェックリスト

Cloudflare Workers で提供している Scrapbox API Proxy (`/api/pages/:project`) のセキュリティ境界を、**実 HTTP リクエスト**で定期的に確認するためのチェックリスト。

## 位置付け

- Vitest では `fetch` をモックした単体テストでセキュリティ観点を検証している (`tests/worker/**/*.test.ts`)。
- このチェックリストは「実際の Cloudflare Edge (Preview / 本番) でも同じ挙動になっているか」を確認する**補完的な手動検証**。
- 自動スキャナ (OWASP ZAP / nuclei / Burp 等) は**使わない**方針。チェックリスト化することで差分をレビューしやすくする。

## 前提

- 対象環境の URL を環境変数で切り替える:
  ```shell
  export BASE_URL="https://kjr020.dev"                # 本番 (カスタムドメイン)
  # export BASE_URL="https://kjr020-blog.johnjiro1114.workers.dev"         # Cloudflare Workersの本番デプロイの既定URL
  # export BASE_URL="http://localhost:8788"            # wrangler dev
  export PROJECT="KJR020"
  ```
- `-i` で**レスポンスヘッダを必ず確認**する (ステータス・`Cache-Control`・`Access-Control-Allow-Origin`)。
- 実行時は**本番ユーザーのセッション Cookie を絶対に送らない** (`-b` / `--cookie` を使わない)。

## チェック項目

### 1. プロジェクト名バリデーション (K-2)

実装: 許可するprojectは `KJR020` のみ。`validateProject()` は `/^[\w-]+$/` + 1〜64 文字で制限。

| # | コマンド | 期待レスポンス |
|---|---|---|
| 1-1 | `curl -i "$BASE_URL/api/pages/$PROJECT"` | `200 OK`、`Content-Type: application/json` |
| 1-2 | `curl -i "$BASE_URL/api/pages/..%2f..%2fetc"` | `400 Bad Request`、body に Scrapbox の内部情報が含まれない |
| 1-3 | `curl -i --path-as-is "$BASE_URL/api/pages/../../etc/passwd"` | `400` か `404` (URL正規化またはStatic Assetsに吸収される)、Scrapbox API には到達しない |
| 1-4 | `curl -i "$BASE_URL/api/pages/%2e%2e%2fetc"` | `400 Bad Request` |
| 1-5 | `curl -i "$BASE_URL/api/pages/foo%00bar"` | `400 Bad Request` (NULL バイト) |
| 1-6 | `LONG=$(printf 'a%.0s' {1..10000}); curl -i "$BASE_URL/api/pages/$LONG"` | `400` もしくは `414` (URI Too Long)。500 は NG |
| 1-7 | `curl -i "$BASE_URL/api/pages/$(printf 'a%.0s' {1..64})"` | `400 Bad Request`（許可するprojectは `KJR020` のみ） |
| 1-8 | `curl -i "$BASE_URL/api/pages/$(printf 'a%.0s' {1..65})"` | `400 Bad Request` |

### 2. CORS (K-9)

実装は `Access-Control-Allow-Origin` を付与しない。Browserからは同一Originで利用する。CORSはcurl等からのアクセスを拒否する認証機能ではない。

| # | コマンド | 期待レスポンス |
|---|---|---|
| 2-1 | `curl -i -H "Origin: https://kjr020.dev" "$BASE_URL/api/pages/$PROJECT"` | `Access-Control-Allow-Origin` なし |
| 2-2 | `curl -i -H "Origin: https://example.com" "$BASE_URL/api/pages/$PROJECT"` | `Access-Control-Allow-Origin` なし |
| 2-3 | `curl -i -H "Origin: null" "$BASE_URL/api/pages/$PROJECT"` | `Access-Control-Allow-Origin` なし |
| 2-4 | `curl -i "$BASE_URL/api/pages/$PROJECT"` | `Access-Control-Allow-Origin` なし |

### 3. Secret 非露出 (K-1)

実装: レスポンス body / ヘッダに `SCRAPBOX_SID` / `connect.sid` の値を出さない。

| # | コマンド | 期待レスポンス |
|---|---|---|
| 3-1 | `curl -s "$BASE_URL/api/pages/$PROJECT" \| grep -i 'connect\.sid\|SCRAPBOX_SID\|Set-Cookie'` | **何もヒットしない** |
| 3-2 | `curl -sD - -o /dev/null "$BASE_URL/api/pages/$PROJECT" \| grep -i 'Set-Cookie'` | **何もヒットしない** (Proxy は Cookie を中継しない) |
| 3-3 | 下記の準備を行い、`curl -i "$TEST_BASE_URL/api/pages/$PROJECT"` を叩く | `5xx`、body は `{"error":"Internal server error"}` 等の**汎用メッセージ**のみ。内部スタックや SID 値が漏れていないこと |

#### 3-3 の準備

1. Cloudflare Workers上に、本番とは独立した検証用デプロイを作成する。キャッシュキーが既存環境と重ならないよう、過去に使用していない新しいホスト名を使う。本番のカスタムドメインと本番の `workers.dev` URLは使用しない。
2. 最初のAPIリクエストを送る前に、その検証用デプロイへ空文字ではない無効な `SCRAPBOX_SID` を設定する。有効なSecretでの疎通確認は先に行わない。
3. `TEST_BASE_URL` に検証用デプロイのOriginを設定する。前提節の本番向け `BASE_URL` はこの項目では使わない。
4. 3-3を実行する。200が返った場合は検証成功とせず、接続先・Secret・キャッシュの前提を確認する。

キャッシュキーは `<Origin>/api/pages/KJR020?limit=100` に正規化される。新しいホスト名で成功レスポンスを一度も保存していない状態を用意することで、既存の正常キャッシュを返さず上流の認証エラー経路を検証する。クエリパラメータを変えてもキャッシュ回避にはならない。既存の検証環境を再利用する場合はこの前提を満たさないため、新しいホスト名でやり直す。

### 4. Cache-Control (K-10)

実装: 成功200は `public, max-age=300, s-maxage=600`、エラー 4xx/5xx は `no-store`。

| # | コマンド | 期待レスポンス |
|---|---|---|
| 4-1 | `curl -sD - -o /dev/null "$BASE_URL/api/pages/$PROJECT" \| grep -i '^Cache-Control:'` | `public, max-age=300, s-maxage=600` |
| 4-2 | `curl -sD - -o /dev/null "$BASE_URL/api/pages/invalid-project" \| grep -i '^Cache-Control:'` | `no-store` |

### 5. HTTP メソッド

実装: `worker/index.ts` のルーターがGET以外に405と `Allow: GET` を返す。HEADはStatic Assetsに委譲して404を返す。

| # | コマンド | 期待レスポンス |
|---|---|---|
| 5-1 | `curl -i -X POST "$BASE_URL/api/pages/$PROJECT"` | `405 Method Not Allowed` + `Allow: GET` |
| 5-2 | `curl -i -X PUT "$BASE_URL/api/pages/$PROJECT"` | `405 Method Not Allowed` + `Allow: GET` |
| 5-3 | `curl -i -X DELETE "$BASE_URL/api/pages/$PROJECT"` | `405 Method Not Allowed` + `Allow: GET` |

## 実行タイミング

- **リリース前**: `feature/*` → `main` のマージ前 Cloudflare Workers上の検証用デプロイまたはローカルのWranglerに対して 1〜5 を全項目実行。
- **定期**: 四半期ごと、もしくは CORS / バリデーション周りの変更があった PR 時。
- **結果の記録**: 異常があった場合のみ Issue として残す。正常結果は記録不要。

## 関連

- 実装: `worker/_lib/cms-proxy.ts`、`worker/_lib/http.ts`
- 単体テスト: `tests/worker/_lib/*.test.ts`、`tests/worker/api/**/*.test.ts`
- セキュリティ要件 ID: K-1 (Secret 非露出), K-2 (project バリデーション), K-9 (CORS 制限), K-10 (Cache-Control)
