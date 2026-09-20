/** @vitest-environment node */
/**
 * http.ts のユニットテスト。
 *
 * 設計方針: 同値分割 (Equivalence Class Partitioning) + 境界値分析 (BVA) で入力空間を分類し、
 * 各クラスに最低1件のテストを置く。異常系はクラス単位で `it.each` を使って羅列を避ける。
 *
 * 入力クラス (getAllowedOrigin):
 *   [A] Origin ヘッダ欠落
 *   [B] ホワイトリスト完全一致 (正常系)
 *   [C] localhost 特例 (正常系・プレフィックスマッチ)
 *   [D] ホワイトリストに類似するが不一致 (境界・異常系)
 *   [E] localhost に類似するが不一致 (境界・異常系)
 *   [F] 特殊値 (異常系)
 *
 * 入力クラス (jsonResponse):
 *   [G] status → Cache-Control
 *   [H] Origin → CORS ヘッダ
 *   [I] 常に付与されるヘッダ
 */
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
  describe("[G] status → Cache-Control マッピング", () => {
    it("成功 (200) は `public, max-age=300` でキャッシュ可", () => {
      const res = jsonResponse({ ok: true }, 200, reqWith());
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    });

    // エラー系は 400 / 500 の両方で同じ挙動を確認 (status >= 400 の境界)
    it.each([
      ["4xx (クライアントエラー)", 400],
      ["4xx 境界", 404],
      ["5xx (サーバエラー)", 500],
      ["5xx 上限", 599],
    ])("%s は `no-store` でキャッシュしない (status=%d)", (_label, status) => {
      const res = jsonResponse({ error: "x" }, status, reqWith());
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    // 3xx も成功側として扱う (現実装は status < 400 でキャッシュ)
    it("リダイレクト (302) はキャッシュ可 (成功側扱い)", () => {
      const res = jsonResponse({ location: "/" }, 302, reqWith());
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    });
  });

  describe("[H] Origin → CORS ヘッダ", () => {
    it("許可 Origin では Access-Control-Allow-Origin を反映し Vary: Origin を付与", () => {
      const res = jsonResponse({ ok: true }, 200, reqWith("https://kjr020.dev"));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://kjr020.dev");
      expect(res.headers.get("Vary")).toBe("Origin");
    });

    it("許可外 Origin では CORS ヘッダを付与しない (fail-closed)", () => {
      const res = jsonResponse({ ok: true }, 200, reqWith("https://evil.com"));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(res.headers.get("Vary")).toBeNull();
    });

    it("Origin ヘッダ無しなら CORS ヘッダを付与しない", () => {
      const res = jsonResponse({ ok: true }, 200, reqWith());
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("エラー時でも許可 Origin には CORS ヘッダを付ける (ブラウザが body を読めるように)", () => {
      const res = jsonResponse({ error: "x" }, 500, reqWith("https://kjr020.dev"));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://kjr020.dev");
    });
  });

  describe("[I] 常に付与されるヘッダ", () => {
    it("Content-Type: application/json を必ず付与", () => {
      const res = jsonResponse({ ok: true }, 200, reqWith());
      expect(res.headers.get("Content-Type")).toBe("application/json");
    });

    it("body は JSON 文字列化される", async () => {
      const res = jsonResponse({ hello: "world" }, 200, reqWith());
      expect(await res.json()).toEqual({ hello: "world" });
    });

    it("指定した status がそのまま Response に反映される", () => {
      const res = jsonResponse({ error: "x" }, 418, reqWith());
      expect(res.status).toBe(418);
    });
  });
});
