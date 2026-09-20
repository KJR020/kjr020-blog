# Cosense API Proxy手動検証チェックリスト

[Cosense API Proxy](../architecture/cosense-api-proxy.md)が定義するセキュリティ境界を、実環境へのHTTPリクエストで確認する手順を定める。

## 概要

- 仕様の正本は[Cosense API Proxy](../architecture/cosense-api-proxy.md)とし、この文書は仕様を言い直さない
  - 手順の側に仕様を複製すると、仕様が変わったときに期待値だけが古いまま残るため
  - 各検証項目は、対応する仕様の節を参照する。仕様を変更したら、その節を参照する項目の期待値を更新する
- 単体テストは`fetch`をモックして同じ観点を検証している。この手順は、実際のCloudflare環境でも同じ挙動になることを確認する補完とする
- 自動スキャナ(OWASP ZAP、nuclei、Burpなど)は使わない
  - 対象が1エンドポイントで、チェックリストのほうが差分をレビューしやすいため

## 前提

対象環境のURLを環境変数で切り替える。

```shell
export BASE_URL="https://kjr020.dev"          # Production
# export BASE_URL="<Preview deploymentのURL>"  # Preview
# export BASE_URL="http://localhost:8788"      # wrangler pages dev
```

- `-i`または`-I`でレスポンスヘッダを確認する
- Cookieを送らない。`-b`と`--cookie`を使わない

## 検証項目

### 1. projectの制限

仕様: [API仕様](../architecture/cosense-api-proxy.md#api仕様)、[エラー処理](../architecture/cosense-api-proxy.md#エラー処理)

| # | コマンド | 期待する結果 |
| --- | --- | --- |
| 1-1 | `curl -i "$BASE_URL/api/pages/KJR020"` | `200`、`Content-Type: application/json` |
| 1-2 | `curl -i "$BASE_URL/api/pages/other-project"` | `400`。形式が正しくても`KJR020`以外は受け付けない |
| 1-3 | `curl -i "$BASE_URL/api/pages/..%2f..%2fetc"` | `400` |
| 1-4 | `curl -i --path-as-is "$BASE_URL/api/pages/../../etc/passwd"` | `400`か`404`。Cosense APIへ到達しない |
| 1-5 | `curl -i "$BASE_URL/api/pages/foo%00bar"` | `400` |
| 1-6 | `LONG=$(printf 'a%.0s' {1..10000}); curl -i "$BASE_URL/api/pages/$LONG"` | `400`か`414`。`500`にならない |

### 2. query parameterの無視

仕様: [API仕様](../architecture/cosense-api-proxy.md#api仕様)

| # | コマンド | 期待する結果 |
| --- | --- | --- |
| 2-1 | `curl -s "$BASE_URL/api/pages/KJR020?limit=1" \| jq length` | queryなしの場合と同じ件数 |
| 2-2 | `curl -i "$BASE_URL/api/pages/KJR020?skip=99999&foo=bar"` | `200`。queryなしの場合と同じ応答 |

### 3. CORS

仕様: [CORS](../architecture/cosense-api-proxy.md#cors)

| # | コマンド | 期待する結果 |
| --- | --- | --- |
| 3-1 | `curl -i -H "Origin: https://kjr020.dev" "$BASE_URL/api/pages/KJR020"` | `Access-Control-Allow-Origin`が付かない |
| 3-2 | `curl -i -H "Origin: https://evil.example" "$BASE_URL/api/pages/KJR020"` | `Access-Control-Allow-Origin`が付かない |

### 4. 秘密情報の非露出

仕様: [秘密情報](../architecture/cosense-api-proxy.md#秘密情報)、[エラー処理](../architecture/cosense-api-proxy.md#エラー処理)

| # | コマンド | 期待する結果 |
| --- | --- | --- |
| 4-1 | `curl -si "$BASE_URL/api/pages/KJR020" \| grep -i 'connect\.sid\|SCRAPBOX_SID\|Set-Cookie'` | 何も一致しない |
| 4-2 | Previewで`SCRAPBOX_SID`を無効な値にして`curl -i "$BASE_URL/api/pages/KJR020"` | `502`。bodyは汎用のエラーメッセージだけで、Cosenseの応答本文、内部エラー、SIDの値を含まない |

### 5. Cache-Control

仕様: [キャッシュ](../architecture/cosense-api-proxy.md#キャッシュ)、[エラー処理](../architecture/cosense-api-proxy.md#エラー処理)

| # | コマンド | 期待する結果 |
| --- | --- | --- |
| 5-1 | `curl -sI "$BASE_URL/api/pages/KJR020" \| grep -i '^cache-control:'` | 仕様が定める成功時の値 |
| 5-2 | `curl -sI "$BASE_URL/api/pages/other-project" \| grep -i '^cache-control:'` | `no-store` |

### 6. HTTPメソッド

仕様: [API仕様](../architecture/cosense-api-proxy.md#api仕様)

| # | コマンド | 期待する結果 |
| --- | --- | --- |
| 6-1 | `curl -i -X POST "$BASE_URL/api/pages/KJR020"` | `405` |
| 6-2 | `curl -i -X PUT "$BASE_URL/api/pages/KJR020"` | `405` |
| 6-3 | `curl -i -X DELETE "$BASE_URL/api/pages/KJR020"` | `405` |

## 実行タイミング

- Pages Functionまたは`functions/_lib/`を変更するPull Requestでは、Preview deploymentに対して全項目を実行する
- 変更がなくても、四半期ごとにProductionに対して全項目を実行する
- 異常があった場合だけIssueに記録する。正常な結果は記録しない

## 関連ファイル

- [Cosense API Proxy](../architecture/cosense-api-proxy.md) - 検証対象の仕様
- [Cosense APIエンドポイント](../../functions/api/pages/%5Bproject%5D.ts) - Pages Functionの入口
- [Cosense Proxy](../../functions/_lib/cms-proxy.ts) - projectの検証と上流取得
- [Pages Functionのテスト](../../tests/functions/api/pages/%5Bproject%5D.test.ts) - 同じ観点の単体テスト
