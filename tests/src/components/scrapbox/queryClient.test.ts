import { describe, expect, it } from "vitest";
import { queryClient } from "@/components/scrapbox/queryClient";

describe("queryClient", () => {
  it("クライアント側クエリの既定値を設定する", () => {
    const defaultOptions = queryClient.getDefaultOptions();

    expect(defaultOptions.queries).toMatchObject({
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    });
  });
});
