/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { getAllowedOrigin, jsonResponse } from "../../../functions/_lib/http";

/** Origin ヘッダを持った (または持たない) Request を生成 */
function reqWith(origin?: string): Request {
  const headers = new Headers();
  if (origin !== undefined) headers.set("Origin", origin);
  return new Request("https://kjr020.pages.dev/api/test", { headers });
}

describe("getAllowedOrigin", () => {
  describe("[A] Origin ヘッダ欠落", () => {
    it("Origin ヘッダが無ければ null を返す", () => {
      expect(getAllowedOrigin(reqWith())).toBeNull();
    });
  });

  describe("[B] ホワイトリスト完全一致 (正常系)", () => {
    it.each([
      ["本番カスタムドメイン", "https://kjr020.dev"],
      ["Cloudflare Pages プレビュー", "https://kjr020.pages.dev"],
    ])("%s は Origin をそのまま返す (%s)", (_label, origin) => {
      expect(getAllowedOrigin(reqWith(origin))).toBe(origin);
    });
  });

  describe("[C] localhost 特例 (正常系・プレフィックスマッチ)", () => {
    it.each([
      ["Astro dev (4321)", "http://localhost:4321"],
      ["Vite dev (3000)", "http://localhost:3000"],
      ["wrangler pages dev (8788)", "http://localhost:8788"],
    ])("%s は任意ポートを許可する (%s)", (_label, origin) => {
      expect(getAllowedOrigin(reqWith(origin))).toBe(origin);
    });
  });

  describe("[D] ホワイトリストに類似するが不一致 (境界・異常系)", () => {
    it.each([
      ["末尾スラッシュ違い", "https://kjr020.dev/"],
      ["大文字違い (ホスト)", "https://KJR020.dev"],
      ["スキーム違い (http)", "http://kjr020.dev"],
      ["サブドメイン偽装 (*.kjr020.dev.evil.com)", "https://kjr020.dev.evil.com"],
      ["ポート追加", "https://kjr020.dev:8080"],
      ["廃止された旧本番 (github.io)", "https://kjr020.github.io"],
    ])("%s は拒否する (%s)", (_label, origin) => {
      expect(getAllowedOrigin(reqWith(origin))).toBeNull();
    });
  });

  describe("[E] localhost に類似するが不一致 (境界・異常系)", () => {
    it.each([
      ["IPv4 ループバック (127.0.0.1)", "http://127.0.0.1:4321"],
      ["localhost を接頭辞に含む偽装", "http://localhost.evil.com"],
      ["IPv6 ループバック", "http://[::1]:4321"],
    ])("%s は拒否する (%s)", (_label, origin) => {
      expect(getAllowedOrigin(reqWith(origin))).toBeNull();
    });
  });

  describe("[F] 特殊値 (異常系)", () => {
    it.each([
      ["文字列 'null' (iframe 等の特殊 Origin)", "null"],
      ["file:// スキーム", "file://"],
      ["data URI", "data:text/html,foo"],
      ["空文字列", ""],
    ])("%s は拒否する (%s)", (_label, origin) => {
      expect(getAllowedOrigin(reqWith(origin))).toBeNull();
    });
  });
});

describe("jsonResponse", () => {
  it("成功時はBrowserに300秒のキャッシュを許可する", () => {
    const response = jsonResponse({ ok: true }, 200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it.each([400, 404, 500, 599])("エラーstatus %d は保存しない", (status) => {
    const response = jsonResponse({ error: "x" }, status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("CORSヘッダーを付けない", () => {
    const response = jsonResponse({ ok: true }, 200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Vary")).toBeNull();
  });

  it("JSON bodyとstatusを返す", async () => {
    const response = jsonResponse({ hello: "world" }, 201);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ hello: "world" });
  });
});
