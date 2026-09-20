/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestGet } from "../../../../functions/api/pages/[project]";

afterEach(() => vi.unstubAllGlobals());

function mockSuccessfulScrapboxFetch() {
  return vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        projectName: "KJR020",
        skip: 0,
        limit: 100,
        count: 1,
        pages: [
          {
            id: "p1",
            title: "page-1",
            image: null,
            descriptions: ["desc"],
            updated: 1_700_000_000,
            created: 1_700_000_000,
            views: 10,
            linked: 2,
            linesCount: 20,
            pin: 0,
          },
        ],
      }),
      { status: 200 },
    ),
  );
}

function createContext(
  project: string,
  options?: { origin?: string; scrapboxSid?: string; url?: string },
) {
  const headers = new Headers();
  if (options?.origin) headers.set("Origin", options.origin);
  const url = options?.url ?? `https://kjr020.pages.dev/api/pages/${project}`;
  return {
    params: { project },
    env: { SCRAPBOX_SID: options?.scrapboxSid ?? "test-sid" },
    request: new Request(url, { headers }),
    waitUntil: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: minimum PagesFunction context for testing
  } as any;
}

describe("GET /api/pages/:project", () => {
  it("キャッシュHITでは上流に接続せず保存済みJSONを返す", async () => {
    const cached = new Response(JSON.stringify([{ id: "cached" }]), {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    });
    const match = vi.fn().mockResolvedValue(cached);
    const put = vi.fn();
    vi.stubGlobal("caches", { default: { match, put } });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await onRequestGet(createContext("KJR020"));
    expect(await res.json()).toEqual([{ id: "cached" }]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("キャッシュMISSでは固定キーに200レスポンスを保存する", async () => {
    const match = vi.fn().mockResolvedValue(undefined);
    const put = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("caches", { default: { match, put } });
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020", {
      url: "https://preview.example.dev/api/pages/KJR020?limit=1&unknown=x",
    });
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300, s-maxage=600");
    expect(match.mock.calls[0][0].url).toBe("https://preview.example.dev/api/pages/KJR020?limit=100");
    expect(put.mock.calls[0][0].url).toBe("https://preview.example.dev/api/pages/KJR020?limit=100");
    expect((await put.mock.calls[0][1].json())[0].id).toBe("p1");
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
  });

  it("キャッシュ読み取り失敗時も上流データを返す", async () => {
    vi.stubGlobal("caches", { default: {
      match: vi.fn().mockRejectedValue(new Error("cache unavailable")),
      put: vi.fn().mockResolvedValue(undefined),
    } });
    const fetchMock = mockSuccessfulScrapboxFetch();
    vi.stubGlobal("fetch", fetchMock);
    const res = await onRequestGet(createContext("KJR020"));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("キャッシュ保存が同期的に失敗しても200を返す", async () => {
    vi.stubGlobal("caches", { default: {
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockImplementation(() => { throw new Error("write unavailable"); }),
    } });
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const res = await onRequestGet(createContext("KJR020"));
    expect(res.status).toBe(200);
  });
  it("KJR020以外の有効なprojectを400で拒否し、上流へ接続しない", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await onRequestGet(createContext("other-project"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("入力queryを無視し、上流にはlimit=100だけを送る", async () => {
    const fetchMock = mockSuccessfulScrapboxFetch();
    vi.stubGlobal("fetch", fetchMock);
    const res = await onRequestGet(createContext("KJR020", {
      url: "https://kjr020.pages.dev/api/pages/KJR020?limit=1&skip=5",
    }));
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe("https://scrapbox.io/api/pages/KJR020?limit=100");
  });
  it("不正なプロジェクト名 (path traversal) を 400 で拒否する", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const ctx = createContext("../../users");
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid project name" });
  });

  it("URL エンコードされたパストラバーサル (%2e%2e%2f) を 400 で拒否する", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const ctx = createContext("%2e%2e%2fetc");
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(400);
  });

  it("制御文字入りのプロジェクト名を 400 で拒否する", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const ctx = createContext("abc\ndef");
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(400);
  });

  it("極端に長いプロジェクト名 (10KB) を 400 で拒否する", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const ctx = createContext("a".repeat(10_000));
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(400);
  });

  it("SCRAPBOX_SID 未設定時は 500 を返す", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const ctx = createContext("KJR020", { scrapboxSid: "" });
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(500);
  });

  it("エラーレスポンスは Cache-Control: no-store", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const ctx = createContext("../../users");
    const res = await onRequestGet(ctx);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("成功レスポンスはBrowser 300秒・共有キャッシュ600秒", async () => {
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020");
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300, s-maxage=600");
  });

  it("許可済みOriginからでもCORSヘッダーを付与しない", async () => {
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const res = await onRequestGet(createContext("KJR020", { origin: "https://kjr020.dev" }));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(res.headers.get("Vary")).toBeNull();
  });

  it("上流4xxを502へ正規化する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })));
    const res = await onRequestGet(createContext("KJR020"));
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("上流が5秒応答しない場合は504を返す", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })));
      const responsePromise = onRequestGet(createContext("KJR020"));
      await vi.advanceTimersByTimeAsync(5_000);
      const res = await responsePromise;
      expect(res.status).toBe(504);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    } finally {
      vi.useRealTimers();
    }
  });

  it("上流のJSON bodyが5秒完了しない場合も504を返す", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, options) => Promise.resolve({
        ok: true,
        status: 200,
        json: () => new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
      })));
      const responsePromise = onRequestGet(createContext("KJR020"));
      await vi.advanceTimersByTimeAsync(5_000);
      const res = await responsePromise;
      expect(res.status).toBe(504);
    } finally {
      vi.useRealTimers();
    }
  });

  it("不正な上流データを502で返し、キャッシュしない", async () => {
    const put = vi.fn();
    vi.stubGlobal("caches", { default: { match: vi.fn().mockResolvedValue(undefined), put } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ pages: null }), { status: 200 })));
    const res = await onRequestGet(createContext("KJR020"));
    expect(res.status).toBe(502);
    expect(put).not.toHaveBeenCalled();
  });

  it("廃止された github.io ドメインは CORS で弾かれる", async () => {
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020", { origin: "https://kjr020.github.io" });
    const res = await onRequestGet(ctx);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("Origin: null は CORS で弾かれる", async () => {
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020", { origin: "null" });
    const res = await onRequestGet(ctx);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("Origin: file:// は CORS で弾かれる", async () => {
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020", { origin: "file://" });
    const res = await onRequestGet(ctx);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("サブドメイン偽装 (https://kjr020.dev.evil.com) は CORS で弾かれる", async () => {
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020", {
      origin: "https://kjr020.dev.evil.com",
    });
    const res = await onRequestGet(ctx);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("末尾スラッシュ付きの許可ドメインは CORS で弾かれる", async () => {
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020", { origin: "https://kjr020.dev/" });
    const res = await onRequestGet(ctx);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("localhost Origin は開発用途で許可される", async () => {
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020", { origin: "http://localhost:4321" });
    const res = await onRequestGet(ctx);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:4321");
  });

  it("レスポンスには SCRAPBOX_SID 値が含まれない", async () => {
    const secret = "s:super-secret-sid.signature";
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020", { scrapboxSid: secret });
    const res = await onRequestGet(ctx);
    const body = await res.text();
    expect(body).not.toContain(secret);
  });

  it("エラーレスポンスの body に SCRAPBOX_SID 値 / connect.sid 文字列が含まれない", async () => {
    const secret = "s:super-secret-sid.signature";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })),
    );
    const ctx = createContext("KJR020", { scrapboxSid: secret });
    const res = await onRequestGet(ctx);
    const body = await res.text();
    expect(body).not.toContain(secret);
    expect(body).not.toContain("connect.sid");
  });

  it("エラーレスポンスの body は汎用メッセージのみ (内部実装を露出しない)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })),
    );
    const ctx = createContext("KJR020");
    const res = await onRequestGet(ctx);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
  });

  it("Upstream エラー時も Cache-Control: no-store", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Server Error", { status: 500 })),
    );
    const ctx = createContext("KJR020");
    const res = await onRequestGet(ctx);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
