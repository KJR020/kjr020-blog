/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handlePagesRequest = vi.fn();
vi.mock("../../worker/api/pages", () => ({
  handlePagesRequest: (...args: unknown[]) => handlePagesRequest(...args),
}));

import worker from "../../worker/index";

function createEnv() {
  return {
    SCRAPBOX_SID: "test-sid",
    ASSETS: { fetch: vi.fn().mockResolvedValue(new Response("asset", { status: 200 })) },
    // biome-ignore lint/suspicious/noExplicitAny: minimum Env for testing
  } as any;
}

// biome-ignore lint/suspicious/noExplicitAny: minimum ExecutionContext for testing
const exec = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

/**
 * Worker の fetch ハンドラへ渡す Request を作る。
 *
 * ランタイムの Request は cf プロパティを持つ IncomingRequest 型のため、
 * 標準の Request からキャストして型を合わせる。
 */
function request(path: string, init?: RequestInit) {
  return new Request(`https://kjr020.dev${path}`, init) as unknown as Parameters<
    typeof worker.fetch
  >[0];
}

beforeEach(() => {
  handlePagesRequest.mockResolvedValue(new Response("[]", { status: 200 }));
});

afterEach(() => vi.clearAllMocks());

describe("Worker routing", () => {
  describe("/api/pages/:project", () => {
    it.each([
      "/api/pages/KJR020",
      "/api/pages/KJR020/",
    ])("%s を API ハンドラへ委譲し、Static Assets を参照しない", async (path) => {
      const env = createEnv();
      const res = await worker.fetch(request(path), env, exec);

      expect(res.status).toBe(200);
      expect(handlePagesRequest).toHaveBeenCalledTimes(1);
      expect(handlePagesRequest.mock.calls[0][3]).toBe("KJR020");
      expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    });

    it("クエリ文字列が付いていてもハンドラへ委譲する", async () => {
      const env = createEnv();
      await worker.fetch(request("/api/pages/KJR020?limit=1"), env, exec);

      expect(handlePagesRequest).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["/api/pages/%2e%2e%2fetc", "../etc"],
      ["/api/pages/KJR020%2Ffoo", "KJR020/foo"],
      ["/api/pages/%254BJR020", "%4BJR020"],
    ])("%s はデコードを1回だけ行い %s をハンドラへ渡す", async (path, expected) => {
      const env = createEnv();
      await worker.fetch(request(path), env, exec);

      expect(handlePagesRequest.mock.calls[0][3]).toBe(expected);
    });

    it("不正なパーセントエンコードは 400 で拒否し、ハンドラを呼ばない", async () => {
      const env = createEnv();
      const res = await worker.fetch(request("/api/pages/%E0%A4%A"), env, exec);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid project name" });
      expect(handlePagesRequest).not.toHaveBeenCalled();
    });

    it.each([
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ])("%s は 405 で拒否し、ハンドラも Static Assets も呼ばない", async (method) => {
      const env = createEnv();
      const res = await worker.fetch(request("/api/pages/KJR020", { method }), env, exec);

      expect(res.status).toBe(405);
      expect(handlePagesRequest).not.toHaveBeenCalled();
      expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    });

    it("405 応答は Allow ヘッダーを返す", async () => {
      const env = createEnv();
      const res = await worker.fetch(request("/api/pages/KJR020", { method: "POST" }), env, exec);

      expect(res.headers.get("Allow")).toBe("GET");
    });

    it("405 応答はキャッシュさせない", async () => {
      const env = createEnv();
      const res = await worker.fetch(request("/api/pages/KJR020", { method: "POST" }), env, exec);

      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("HEAD は Pages と同じく Static Assets へ委譲する", async () => {
      const env = createEnv();
      const res = await worker.fetch(request("/api/pages/KJR020", { method: "HEAD" }), env, exec);

      expect(res.status).toBe(200);
      expect(env.ASSETS.fetch).toHaveBeenCalledTimes(1);
      expect(handlePagesRequest).not.toHaveBeenCalled();
    });
  });

  describe("API 以外のパス", () => {
    it.each([
      "/",
      "/posts/",
      "/_astro/app.css",
      "/pagefind/pagefind.js",
      "/api",
      "/api/",
      "/api/pages",
      "/api/pages/KJR020/extra",
      "/api/unknown",
    ])("%s は Static Assets へ委譲する", async (path) => {
      const env = createEnv();
      const res = await worker.fetch(request(path), env, exec);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("asset");
      expect(env.ASSETS.fetch).toHaveBeenCalledTimes(1);
      expect(handlePagesRequest).not.toHaveBeenCalled();
    });

    it("Static Assets へは元の Request をそのまま渡す", async () => {
      const env = createEnv();
      const req = request("/posts/");
      await worker.fetch(req, env, exec);

      expect(env.ASSETS.fetch).toHaveBeenCalledWith(req);
    });
  });
});
