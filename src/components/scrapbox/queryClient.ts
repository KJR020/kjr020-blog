import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5分間はキャッシュを使用
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** ブラウザで使うQueryClient。ページ内のReact Islandが同じキャッシュを参照する。 */
export const queryClient = createQueryClient();
