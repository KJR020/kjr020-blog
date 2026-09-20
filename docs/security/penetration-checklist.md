# Scrapbox API Proxy 手動検証チェックリスト

Cloudflare Pages Functions で提供している Scrapbox API Proxy (`/api/pages/:project`) のセキュリティ境界を、**実 HTTP リクエスト**で定期的に確認するためのチェックリスト。

## 位置付け

- Vitest では `fetch` をモックした単体テストでセキュリティ観点を検証している (`tests/functions/**/*.test.ts`)。
- このチェックリストは「実際の Cloudflare Edge (Preview / 本番) でも同じ挙動になっているか」を確認する**補完的な手動検証**。
- 自動スキャナ (OWASP ZAP / nuclei / Burp 等) は**使わない**方針。チェックリスト化することで差分をレビューしやすくする。

## 前提

- 対象環境の URL を環境変数で切り替える:
  ```shell
  export BASE_URL="https://kjr020.dev"                # 本番 (カスタムドメイン)
  # export BASE_URL="https://kjr020.pages.dev"         # Preview / Cloudflare Pages デフォルト
  # export BASE_URL="http://localhost:8788"            # wrangler pages dev
  export PROJECT="KJR020"
  ```
- `-i` で**レスポンスヘッダを必ず確認**する (ステータス・`Cache-Control`・`Access-Control-Allow-Origin`)。
- 実行時は**本番ユーザーのセッション Cookie を絶対に送らない** (`-b` / `--cookie` を使わない)。

## チェック項目

### 1. プロジェクト名バリデーション (K-2)

実装: `validateProject()` は `/^[\w-]+$/` + 1〜64 文字で制限。

| # | コマンド | 期待レスポンス |
|---|---|---|
| 1-1 | `curl -i "$BASE_URL/api/pages/$PROJECT"` | `200 OK`、`Content-Type: application/json` |
| 1-2 | `curl -i "$BASE_URL/api/pages/..%2f..%2fetc"` | `400 Bad Request`、body に Scrapbox の内部情報が含まれない |
| 1-3 | `curl -i --path-as-is "$BASE_URL/api/pages/../../etc/passwd"` | `400` か `404` (Pages のルーターに吸収される)、Scrapbox API には到達しない |
| 1-4 | `curl -i "$BASE_URL/api/pages/%2e%2e%2fetc"` | `400 Bad Request` |
| 1-5 | `curl -i "$BASE_URL/api/pages/foo%00bar"` | `400 Bad Request` (NULL バイト) |
| 1-6 | `LONG=$(printf 'a%.0s' {1..10000}); curl -i "$BASE_URL/api/pages/$LONG"` | `400` もしくは `414` (URI Too Long)。500 は NG |
| 1-7 | `curl -i "$BASE_URL/api/pages/$(printf 'a%.0s' {1..64})"` | `200` or `404` (Upstream 次第)。**`400` で落ちないこと** |
| 1-8 | `curl -i "$BASE_URL/api/pages/$(printf 'a%.0s' {1..65})"` | `400 Bad Request` |

### 2. CORS ホワイトリスト (K-9)

実装: `getAllowedOrigin()` は本番 2 ドメイン + `http://localhost:*` のみを許可。

| # | コマンド | 期待レスポンス |
|---|---|---|
| 2-1 | `curl -i -H "Origin: https://kjr020.dev" "$BASE_URL/api/pages/$PROJECT"` | `Access-Control-Allow-Origin: https://kjr020.dev` + `Vary: Origin` |
| 2-2 | `curl -i -H "Origin: https://kjr020.pages.dev" "$BASE_URL/api/pages/$PROJECT"` | `Access-Control-Allow-Origin: https://kjr020.pages.dev` |
| 2-3 | `curl -i -H "Origin: http://localhost:4321" "$BASE_URL/api/pages/$PROJECT"` | `Access-Control-Allow-Origin: http://localhost:4321` |
| 2-4 | `curl -i "$BASE_URL/api/pages/$PROJECT"` (Origin なし) | `Access-Control-Allow-Origin` ヘッダが**付かない** |
| 2-5 | `curl -i -H "Origin: null" "$BASE_URL/api/pages/$PROJECT"` | `Access-Control-Allow-Origin` なし |
| 2-6 | `curl -i -H "Origin: file://" "$BASE_URL/api/pages/$PROJECT"` | `Access-Control-Allow-Origin` なし |
| 2-7 | `curl -i -H "Origin: https://kjr020.dev/" "$BASE_URL/api/pages/$PROJECT"` (末尾スラッシュ) | `Access-Control-Allow-Origin` なし |
| 2-8 | `curl -i -H "Origin: https://KJR020.dev" "$BASE_URL/api/pages/$PROJECT"` (大文字違い) | `Access-Control-Allow-Origin` なし |
| 2-9 | `curl -i -H "Origin: https://kjr020.dev.evil.com" "$BASE_URL/api/pages/$PROJECT"` (サブドメイン偽装) | `Access-Control-Allow-Origin` なし |
| 2-10 | `curl -i -H "Origin: http://kjr020.dev" "$BASE_URL/api/pages/$PROJECT"` (http スキーム) | `Access-Control-Allow-Origin` なし |
| 2-11 | `curl -i -H "Origin: http://localhost.evil.com" "$BASE_URL/api/pages/$PROJECT"` | `Access-Control-Allow-Origin` なし |
| 2-12 | `curl -i -H "Origin: https://kjr020.github.io" "$BASE_URL/api/pages/$PROJECT"` (廃止された旧本番ドメイン) | `Access-Control-Allow-Origin` なし |

### 3. Secret 非露出 (K-1)

実装: レスポンス body / ヘッダに `SCRAPBOX_SID` / `connect.sid` の値を出さない。

| # | コマンド | 期待レスポンス |
|---|---|---|
| 3-1 | `curl -s "$BASE_URL/api/pages/$PROJECT" \| grep -i 'connect\.sid\|SCRAPBOX_SID\|Set-Cookie'` | **何もヒットしない** |
| 3-2 | `curl -sI "$BASE_URL/api/pages/$PROJECT" \| grep -i 'Set-Cookie'` | **何もヒットしない** (Proxy は Cookie を中継しない) |
| 3-3 | 故意に 401 を誘発するため、Cloudflare 管理画面で `SCRAPBOX_SID` を一時的に無効化した Preview で `curl -i "$BASE_URL/api/pages/$PROJECT"` を叩く | `5xx`、body は `{"error":"Internal server error"}` 等の**汎用メッセージ**のみ。内部スタックや SID 値が漏れていないこと |

### 4. Cache-Control (K-10)

実装: 成功 2xx は `public, max-age=300`、エラー 4xx/5xx は `no-store`。

| # | コマンド | 期待レスポンス |
|---|---|---|
| 4-1 | `curl -sI "$BASE_URL/api/pages/$PROJECT" \| grep -i '^Cache-Control:'` | `public, max-age=300` |
| 4-2 | `curl -sI "$BASE_URL/api/pages/../../etc" \| grep -i '^Cache-Control:'` | `no-store` |
### 5. HTTP メソッド

実装: `onRequestGet` のみ export しているため、他メソッドは Cloudflare Pages Functions 側で自動的に 405 相当になる。

| # | コマンド | 期待レスポンス |
|---|---|---|
| 5-1 | `curl -i -X POST "$BASE_URL/api/pages/$PROJECT"` | `405 Method Not Allowed` |
| 5-2 | `curl -i -X PUT "$BASE_URL/api/pages/$PROJECT"` | `405 Method Not Allowed` |
| 5-3 | `curl -i -X DELETE "$BASE_URL/api/pages/$PROJECT"` | `405 Method Not Allowed` |

## 実行タイミング

- **リリース前**: `feature/*` → `main` のマージ前 Preview URL に対して 1〜5 を全項目実行。
- **定期**: 四半期ごと、もしくは CORS / バリデーション周りの変更があった PR 時。
- **結果の記録**: 異常があった場合のみ Issue として残す。正常結果は記録不要。

## 関連

- 実装: `functions/_lib/cms-proxy.ts`、`functions/_lib/http.ts`
- 単体テスト: `tests/functions/_lib/*.test.ts`、`tests/functions/api/**/*.test.ts`
- セキュリティ要件 ID: K-1 (Secret 非露出), K-2 (project バリデーション), K-9 (CORS 制限), K-10 (Cache-Control)
