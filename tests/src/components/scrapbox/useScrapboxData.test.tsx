import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScrapboxPageData } from "@/components/scrapbox/types";
import { useScrapboxData } from "@/components/scrapbox/useScrapboxData";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function page(id: string): ScrapboxPageData {
  return {
    id,
    title: id,
    imageUrl: null,
    description: "",
    updatedAt: "2026-05-05T00:00:00Z",
    url: `https://scrapbox.io/example/${id}`,
  };
}

describe("useScrapboxData", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("project名をエンコードしてproxyからページを取得する", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([page("one"), page("two")]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useScrapboxData("project name"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith("/api/pages/project%20name?limit=100");
    expect(result.current.data?.map((item) => item.id)).toEqual(["one", "two"]);
  });

  it("limit指定時は取得結果を先頭から切り出す", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([page("one"), page("two"), page("three")]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useScrapboxData("project", { limit: 2 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((item) => item.id)).toEqual(["one", "two"]);
  });

  it("projectが空ならfetchを実行しない", () => {
    const { result } = renderHook(() => useScrapboxData(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("proxyが失敗したらエラーを返す", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("error", { status: 500 }));

    const { result } = renderHook(() => useScrapboxData("project"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error("API error: 500"));
  });
});
