import worker from "../../../worker";
import type { Env } from "../../../worker/env";

let requests = 0;

/** 保存の完了を待つための検証用入口。本番のルーティングとAPIハンドラをそのまま呼ぶ。 */
async function runWorker(
  request: Parameters<typeof worker.fetch>[0],
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const pending: Promise<unknown>[] = [];
  const response = await worker.fetch(request, env, {
    waitUntil: (promise) => pending.push(promise),
    passThroughOnException: () => ctx.passThroughOnException(),
    props: ctx.props,
    tracing: ctx.tracing,
  });
  await Promise.all(pending);
  return response;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/__test/requests") return Response.json({ requests });
    if (url.pathname === "/__test/seed" && request.method === "POST") {
      const key = new URL("/api/pages/KJR020?limit=100", url);
      await caches.default.delete(key.toString());
      const response = await runWorker(
        new Request<unknown, IncomingRequestCfProperties>(key),
        env,
        ctx,
      );
      if (response.status !== 200) throw new Error("Cannot seed an unsuccessful response");
      const age = url.searchParams.get("age") ?? "0";
      const seeded = new Response(response.body, response);
      seeded.headers.set("Age", age);
      await caches.default.put(key.toString(), seeded);
      requests = 0;
      return new Response(null, { status: 204 });
    }
    if (url.pathname.startsWith("/api/")) requests++;
    return runWorker(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
