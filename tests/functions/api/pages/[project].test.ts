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
    // biome-ignore lint/suspicious/noExplicitAny: minimum PagesFunction context for testing
  } as any;
}

describe("GET /api/pages/:project", () => {
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

  it("成功レスポンスは Cache-Control: public, max-age=300", async () => {
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020");
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
  });

  it("本番ドメイン Origin は CORS で許可される", async () => {
    vi.stubGlobal("fetch", mockSuccessfulScrapboxFetch());
    const ctx = createContext("KJR020", { origin: "https://kjr020.dev" });
    const res = await onRequestGet(ctx);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://kjr020.dev");
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
