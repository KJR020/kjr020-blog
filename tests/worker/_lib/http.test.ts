/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { jsonResponse } from "../../../worker/_lib/http";

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
