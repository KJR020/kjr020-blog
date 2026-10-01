import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { TOCListProps } from "./types";

/**
 * 目次リストコンポーネント
 * 見出しの階層構造を維持して表示し、アクティブな項目をハイライト
 */
export function TOCList({
  headings,
  activeId,
  onItemClick,
  avatarSrc,
  avatarAlt = "Avatar",
}: TOCListProps) {
  const activeRef = useRef<HTMLLIElement>(null);

  // アクティブ項目が変わったら、TOCサイドバー内で見える位置にスクロール
  useEffect(() => {
    if (!activeId || !activeRef.current) return;

    const scrollContainer = activeRef.current.closest<HTMLElement>("[data-toc-scroll-container]");
    if (!scrollContainer) return;

    const itemRect = activeRef.current.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const offset =
      itemRect.top < containerRect.top
        ? itemRect.top - containerRect.top
        : itemRect.bottom > containerRect.bottom
          ? itemRect.bottom - containerRect.bottom
          : 0;

    if (offset !== 0) {
      scrollContainer.scrollBy({ behavior: "smooth", top: offset });
    }
  }, [activeId]);
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();

    // スムーズスクロール
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });

      // URLハッシュを更新（クリック時のみ）
      history.pushState(null, "", `#${id}`);
    }

    onItemClick?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e as unknown as React.MouseEvent<HTMLAnchorElement>, id);
    }
  };

  return (
    <ul className="border-l border-border text-[0.8125rem] leading-snug">
      {headings.map((heading) => {
        const isActive = activeId === heading.id;
        const isH3 = heading.level === 3;

        return (
          <li key={heading.id} ref={isActive ? activeRef : undefined} className="relative">
            {/* 現在位置は左の線を太くして示す */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-px top-1 bottom-1 w-0.5 rounded-full bg-brand transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-0",
              )}
            />
            {/* アバターアイコン（デスクトップのみ、アクティブ時） */}
            {avatarSrc && isActive && (
              <img
                src={avatarSrc}
                alt={avatarAlt}
                className={cn(
                  "absolute -left-7 top-1/2 -translate-y-1/2",
                  "w-5 h-5 rounded-full",
                  "transition-all duration-300 ease-in-out",
                )}
              />
            )}
            <a
              href={`#${heading.id}`}
              onClick={(e) => handleClick(e, heading.id)}
              onKeyDown={(e) => handleKeyDown(e, heading.id)}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "block rounded-sm py-1.5 pl-4 transition-colors duration-200",
                "hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring",
                isH3 && "pl-7",
                isActive ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {heading.text}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
