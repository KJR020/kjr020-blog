"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QueryProvider } from "./QueryProvider";
import type { ScrapboxPageData } from "./types";
import { useScrapboxData } from "./useScrapboxData";

interface ScrapboxCardListProps {
  project: string;
  limit?: number;
  className?: string;
  pages?: ScrapboxPageData[];
}

/** 記事メタ情報（PostMeta）と同じ表記にする */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const URL_PATTERN = /https?:\/\/\S+/g;

/** Cosenseの記法（リンク、装飾、アイコン、URL）を、一覧で読める平文へ変換する */
export function cleanScrapboxDescription(text: string): string {
  return text
    .replace(/\[[^\]]*\.icon(?:\*\d+)?\]/g, "")
    .replace(/\[[*/\-_!#%]+\s+([^\]]*)\]/g, "$1")
    .replace(/\[([^\]]*)\]/g, (_match, inner: string) => inner.replace(URL_PATTERN, ""))
    .replace(URL_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ScrapboxCardListInner({ project, limit, className, pages }: ScrapboxCardListProps) {
  const { data, isLoading, isError, refetch } = useScrapboxData(project, {
    initialData: pages,
    limit,
  });

  // project 未指定
  if (!project) {
    return (
      <p className={cn("py-phi-sm text-sm text-muted-foreground", className)}>
        プロジェクト名を指定してください
      </p>
    );
  }

  // ローディング
  if (isLoading) {
    return (
      <div className={cn("flex py-phi-sm", className)} data-testid="loading-spinner">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // エラー
  if (isError) {
    return (
      <div className={cn("flex flex-col items-start gap-phi-sm py-phi-sm", className)}>
        <p className="text-sm text-muted-foreground">Cosenseを読み込めませんでした</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          再読み込み
        </Button>
      </div>
    );
  }

  // データ 0 件
  // 補助領域では、中身がないのに見出しと枠だけ残さない。
  // 親が :has() で領域ごと畳めるように印を出す。
  if (!data || data.length === 0) {
    return <div data-notes-empty="true" hidden />;
  }

  return (
    <ul className={cn("flex flex-col border-t border-foreground", className)}>
      {data.map((page) => {
        const description = cleanScrapboxDescription(page.description);
        return (
          <li key={page.id} className="border-b border-border">
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/note block rounded-sm py-phi-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="line-clamp-2 text-[0.9375rem] font-medium leading-snug text-foreground transition-colors group-hover/note:text-link">
                {page.title}
              </span>
              {description && (
                <span className="mt-phi-2xs line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {description}
                </span>
              )}
              <time
                dateTime={page.updatedAt}
                className="mt-phi-2xs block text-xs text-muted-foreground tabular-nums"
              >
                {formatDate(page.updatedAt)}
              </time>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function ScrapboxCardList(props: ScrapboxCardListProps) {
  return (
    <QueryProvider>
      <ScrapboxCardListInner {...props} />
    </QueryProvider>
  );
}
