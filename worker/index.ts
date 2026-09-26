import { handlePagesRequest } from "./api/pages";
import { jsonResponse } from "./_lib/http";
import type { Env } from "./env";

/**
 * Cosense API Proxy のパス。
 *
 * Pages Functions のファイルベースルーティング (api/pages/[project].ts) を
 * 置き換えるもので、末尾スラッシュの有無はどちらも受け付ける。
 */
const PAGES_PATH_PATTERN = /^\/api\/pages\/([^/]+)\/?$/;

/** Cosense API Proxy が受け付けるメソッド。405 応答の Allow ヘッダーに使う。 */
const ALLOWED_METHODS = ["GET"];

/**
 * Static Assets へ委譲するメソッド。
 *
 * Pages Functions は onRequestGet のみを実装しており、HEAD はハンドラ不在のため
 * Static Assets の 404 にフォールバックしていた。移行後も同じ挙動を維持する。
 */
const FALLTHROUGH_METHODS = ["HEAD"];

/**
 * パスセグメントをデコードする。不正なパーセントエンコードは null を返す。
 *
 * Pages Functions では context.params がデコード済みで渡されていたため、
 * 同じ入力が検証ロジックへ届くようにここでデコードする。
 */
function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const match = PAGES_PATH_PATTERN.exec(url.pathname);

    if (match && !FALLTHROUGH_METHODS.includes(request.method)) {
      if (!ALLOWED_METHODS.includes(request.method)) {
        const response = jsonResponse({ error: "Method not allowed" }, 405);
        // RFC 9110 は 405 応答に Allow の付与を求めている。
        response.headers.set("Allow", ALLOWED_METHODS.join(", "));
        return response;
      }

      const project = decodeSegment(match[1]);
      if (project === null) {
        return jsonResponse({ error: "Invalid project name" }, 400);
      }
      return handlePagesRequest(request, env, ctx, project);
    }

    // API ルートに一致しないリクエストは Static Assets へ委譲する。
    // run_worker_first に一致しないリクエストは通常ここへ来ないが、
    // アセットに一致しない非 navigation リクエストは Worker に届くため、
    // Pages と同じ 404 挙動を維持する目的でフォールバックする。
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
