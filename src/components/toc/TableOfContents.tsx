import { cn } from "@/lib/utils";
import { MobileTOC } from "./MobileTOC";
import { TOCList } from "./TOCList";
import type { TableOfContentsProps } from "./types";
import { useScrollSpy } from "./useScrollSpy";

/**
 * 目次コンポーネント
 * デスクトップ: 右側スティッキー表示
 * モバイル: 折りたたみアコーディオン表示
 */
export function TableOfContents({
  headings,
  variant = "responsive",
  className,
  avatarSrc,
  avatarAlt,
}: TableOfContentsProps) {
  const headingIds = headings.map((h) => h.id);
  const { activeId } = useScrollSpy(headingIds);

  // 見出しがない場合は何も表示しない
  if (headings.length === 0) {
    return null;
  }

  const showsMobile = variant === "responsive" || variant === "mobile";
  const showsDesktop = variant === "responsive" || variant === "desktop";

  return (
    <>
      {/* モバイル表示: 折りたたみアコーディオン */}
      {showsMobile && <MobileTOC headings={headings} activeId={activeId} />}

      {/* デスクトップ表示: スティッキーサイドバー */}
      {showsDesktop && (
        <div className={cn("hidden lg:block", "sticky top-24", className)}>
          <h2 className="mb-4 pl-8 text-sm font-semibold text-foreground">目次</h2>

          <nav
            className="max-h-[calc(100vh-11rem)] overflow-y-auto pl-8"
            aria-label="目次"
            data-toc-scroll-container="true"
          >
            <TOCList
              headings={headings}
              activeId={activeId}
              avatarSrc={avatarSrc}
              avatarAlt={avatarAlt}
            />
          </nav>
        </div>
      )}
    </>
  );
}
