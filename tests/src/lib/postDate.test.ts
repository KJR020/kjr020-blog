import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatPostDate, getPostYear } from "@/lib/postDate";

// CIのビルド環境はUTCで動くため、実行環境のタイムゾーンをUTCへ固定して検証する。
beforeEach(() => {
  vi.stubEnv("TZ", "UTC");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("formatPostDate", () => {
  it.each([
    { input: "2026-09-15T00:00:00+09:00", expected: "2026年9月15日" },
    { input: "2026-09-15T23:59:59+09:00", expected: "2026年9月15日" },
    { input: "2026-09-16T00:00:00+09:00", expected: "2026年9月16日" },
  ])("$input を日本時間の日付 $expected として表示する", ({ input, expected }) => {
    expect(formatPostDate(new Date(input))).toBe(expected);
  });
});

describe("getPostYear", () => {
  it.each([
    { input: "2026-01-01T00:00:00+09:00", expected: 2026 },
    { input: "2025-12-31T23:59:59+09:00", expected: 2025 },
  ])("$input を日本時間の年 $expected として扱う", ({ input, expected }) => {
    expect(getPostYear(new Date(input))).toBe(expected);
  });
});
