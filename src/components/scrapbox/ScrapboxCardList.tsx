"use client";

import { AlertCircle, ChevronLeft, ChevronRight, FileQuestion, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 280;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // project 未指定
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">プロジェクト名を指定してください</p>
      </div>
    );
  }

  // ローディング
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-spinner">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // エラー
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Scrapboxを読み込めませんでした</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          再読み込み
        </Button>
      </div>
    );
  }

  // データ 0 件
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Scrapboxのページがありません</p>
      </div>
    );
  }

  return (
    <div className={cn("relative group", className)}>
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-phi-xs overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {data.map((page) => (
          <a
            key={page.id}
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "shrink-0 w-56 p-4",
              "rounded-lg border",
              "bg-card transition-colors hover:bg-accent/50",
              "group/card",
              "flex flex-col h-40",
            )}
          >
            <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover/card:text-link transition-colors duration-200">
              {page.title}
            </h3>
            <p className="text-xs text-muted-foreground/70 line-clamp-2 mt-2 flex-1">
              {cleanScrapboxDescription(page.description || "")}
            </p>
            <span className="text-[10px] text-muted-foreground/50 mt-auto pt-2">
              {formatDate(page.updatedAt)}
            </span>
          </a>
        ))}
      </div>

      {/* Navigation - only visible on hover */}
      <button
        type="button"
        onClick={() => scroll("left")}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3",
          "h-8 w-8 rounded-full",
          "bg-background border border-border shadow-sm",
          "flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "hover:bg-muted",
          !canScrollLeft && "invisible",
        )}
        aria-label="前へ"
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>
      <button
        type="button"
        onClick={() => scroll("right")}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 translate-x-3",
          "h-8 w-8 rounded-full",
          "bg-background border border-border shadow-sm",
          "flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "hover:bg-muted",
          !canScrollRight && "invisible",
        )}
        aria-label="次へ"
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Subtle fade edges */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export function ScrapboxCardList(props: ScrapboxCardListProps) {
  return (
    <QueryProvider>
      <ScrapboxCardListInner {...props} />
    </QueryProvider>
  );
}
