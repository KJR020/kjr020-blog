import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createQueryClient, queryClient } from "./queryClient";

interface Props {
  children: React.ReactNode;
}

export function QueryProvider({ children }: Props) {
  // サーバーではモジュールが複数ページの描画で共有される。描画ごとにQueryClientを作り、
  // あるページのデータが別のページのHTMLへ混ざらないようにする。
  const [client] = useState(() =>
    typeof window === "undefined" ? createQueryClient() : queryClient,
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
