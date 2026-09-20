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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function cleanScrapboxDescription(text: string): string {
  return text
    .replace(/\[([^\]]*)\]/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
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
    <ul className={cn("flex flex-col", className)}>
      {data.map((page) => (
        <li key={page.id} className="border-b border-border/60 last:border-b-0">
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/note block py-phi-sm transition-colors hover:text-link"
          >
            <span className="block text-base leading-snug text-foreground line-clamp-2 group-hover/note:text-link">
              {page.title}
            </span>
            {page.description && (
              <span className="mt-phi-2xs block text-sm leading-normal text-muted-foreground/70 line-clamp-2">
                {cleanScrapboxDescription(page.description)}
              </span>
            )}
            <span className="mt-phi-2xs block text-sm text-muted-foreground/60">
              {formatDate(page.updatedAt)}
            </span>
          </a>
        </li>
      ))}
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
