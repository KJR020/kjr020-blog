import { fetchPages, type ProxyFailure, validateProject } from "../_lib/cms-proxy";
import { jsonResponse } from "../_lib/http";
import { logError } from "../_lib/logger";
import type { Env } from "../env";

/** 公開するCosenseプロジェクト。ほかのprojectは上流へ問い合わせずに拒否する。 */
const PUBLIC_PROJECT = "KJR020";
/** 上流へ送る取得条件。Browserのquery parameterは使わず、キャッシュキーもこの値に固定する。 */
const UPSTREAM_SEARCH = "?limit=100";
/** Browserは300秒、Cloudflareの共有キャッシュは600秒のあいだ再利用する。 */
const CACHE_CONTROL = "public, max-age=300, s-maxage=600";

/** Cosenseのページ一覧を共有キャッシュから返し、未保存なら上流から取得する。 */
export async function handlePagesRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  project: string,
): Promise<Response> {
  if (project !== PUBLIC_PROJECT || !validateProject(project)) {
    return jsonResponse({ error: "Invalid project name" }, 400);
  }
  if (!env.SCRAPBOX_SID) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  // キャッシュは取得処理の最適化として扱う。読み取りに失敗してもMISSとして上流取得へ進む。
  const cacheKey = createCacheKey(request);
  let cache: Cache | undefined;
  try {
    cache = (caches as CacheStorage & { default: Cache }).default;
    const cached = await cache?.match(cacheKey);
    if (cached) return cached;
  } catch {
    logError({ type: "cache_read_error", project });
  }

  const result = await fetchPages(project, UPSTREAM_SEARCH, env.SCRAPBOX_SID);
  if (!result.ok) {
    return respondToFailure(result, project);
  }

  const response = jsonResponse(result.pages, 200);
  response.headers.set("Cache-Control", CACHE_CONTROL);
  if (cache) {
    saveToCache(cache, cacheKey, response, ctx, project);
  }
  return response;
}

/** Browserから受け取ったqueryによらず、同じデプロイ先では同じキーになるよう正規化する。 */
function createCacheKey(request: Request): Request {
  const url = new URL(request.url);
  url.pathname = `/api/pages/${PUBLIC_PROJECT}`;
  url.search = UPSTREAM_SEARCH;
  return new Request(url.toString());
}

/** 上流取得の失敗を記録し、内部情報を含まないエラーレスポンスへ変換する。 */
function respondToFailure(failure: ProxyFailure, project: string): Response {
  // 401・403はSCRAPBOX_SIDの失効を疑えるよう、ほかの上流エラーと区別して記録する。
  const isAuthExpired =
    failure.code === "upstream_error" && (failure.status === 401 || failure.status === 403);
  logError({
    type: isAuthExpired ? "auth_expired" : failure.code,
    project,
    ...(failure.status ? { upstream_status: failure.status } : {}),
  });
  return jsonResponse({ error: "Internal server error" }, failure.code === "timeout" ? 504 : 502);
}

/** レスポンスの返却を待たせずに保存する。保存に失敗しても、取得済みの200はそのまま返す。 */
function saveToCache(
  cache: Cache,
  cacheKey: Request,
  response: Response,
  ctx: ExecutionContext,
  project: string,
): void {
  try {
    ctx.waitUntil(
      cache.put(cacheKey, response.clone()).catch(() => {
        logError({ type: "cache_write_error", project });
      }),
    );
  } catch {
    logError({ type: "cache_write_error", project });
  }
}
