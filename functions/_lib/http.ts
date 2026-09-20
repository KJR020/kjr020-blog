/**
 * HTTP レスポンス共通ヘルパー。
 *
 * Pages Function のJSONレスポンスとCache-Controlを統一する。
 */

/**
 * JSON レスポンスをCache-Controlヘッダ付きで生成する。
 *
 * - エラー (status >= 400) は `Cache-Control: no-store` で CDN に載せない
 * - 成功時は `public, max-age=300` で 5 分キャッシュ可
 */
export function jsonResponse(body: unknown, status: number): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // エラーレスポンスをキャッシュすると回復後も影響するため、成功時のみキャッシュを許可
    "Cache-Control": status >= 400 ? "no-store" : "public, max-age=300",
  };

  return new Response(JSON.stringify(body), { status, headers });
}
