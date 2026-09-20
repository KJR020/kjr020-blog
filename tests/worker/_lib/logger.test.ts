/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { logError } from "../../../worker/_lib/logger";

describe("logError", () => {
  it("console.error に JSON 文字列を出力する", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError({ type: "test" });
    expect(spy).toHaveBeenCalledOnce();
    expect(() => JSON.parse(spy.mock.calls[0][0])).not.toThrow();
    spy.mockRestore();
  });

  it("level フィールドに error が含まれる", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError({ type: "test" });
    const parsed = JSON.parse(spy.mock.calls[0][0]);
    expect(parsed.level).toBe("error");
    spy.mockRestore();
  });

  it("任意フィールドが透過される", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError({ type: "auth_expired", project: "KJR020", upstream_status: 401 });
    const parsed = JSON.parse(spy.mock.calls[0][0]);
    expect(parsed.type).toBe("auth_expired");
    expect(parsed.project).toBe("KJR020");
    expect(parsed.upstream_status).toBe(401);
    spy.mockRestore();
  });
});
