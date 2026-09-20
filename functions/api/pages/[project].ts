import { fetchPages, validateProject } from "../../_lib/cms-proxy";
import { jsonResponse } from "../../_lib/http";
import { logError } from "../../_lib/logger";

interface Env {
  SCRAPBOX_SID: string;
}

const CACHE_CONTROL = "public, max-age=300, s-maxage=600";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const project = context.params.project as string;
  const scrapboxSid = context.env.SCRAPBOX_SID;

  if (project !== "KJR020" || !validateProject(project)) {
    return jsonResponse({ error: "Invalid project name" }, 400);
  }
  if (!scrapboxSid) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const cacheUrl = new URL(context.request.url);
  cacheUrl.pathname = "/api/pages/KJR020";
  cacheUrl.search = "?limit=100";
  const cacheKey = new Request(cacheUrl.toString());
  let cache: Cache | undefined;
  try {
    cache = (caches as CacheStorage & { default: Cache }).default;
    const cached = await cache?.match(cacheKey);
    if (cached) return cached;
  } catch {
    logError({ type: "cache_read_error", project });
  }

  const result = await fetchPages(project, "?limit=100", scrapboxSid);

  if (!result.ok) {
    const isAuthExpired =
      result.code === "upstream_error" &&
      (result.status === 401 || result.status === 403);
    logError({
      type: isAuthExpired ? "auth_expired" : result.code,
      project,
      ...(result.status ? { upstream_status: result.status } : {}),
    });
    return jsonResponse(
      { error: "Internal server error" },
      result.code === "timeout" ? 504 : 502,
    );
  }

  const response = jsonResponse(result.pages, 200);
  response.headers.set("Cache-Control", CACHE_CONTROL);
  if (cache) {
    try {
      context.waitUntil(
        cache.put(cacheKey, response.clone()).catch(() => {
          logError({ type: "cache_write_error", project });
        }),
      );
    } catch {
      logError({ type: "cache_write_error", project });
    }
  }
  return response;
};
