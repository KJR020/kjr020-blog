import { useEffect, useState } from "react";
import type { UseScrollSpyOptions, UseScrollSpyReturn } from "./types";

/**
 * Intersection Observerを使用してアクティブな見出しを検出するフック
 * @param headingIds 監視する見出し要素のID配列
 * @param options オプション設定
 * @returns 現在アクティブな見出しのID
 */
export function useScrollSpy(
  headingIds: string[],
  options?: UseScrollSpyOptions,
): UseScrollSpyReturn {
  const [activeId, setActiveId] = useState<string | null>(headingIds[0] ?? null);

  useEffect(() => {
    if (headingIds.length === 0) {
      return;
    }

    // ビューポート内の見出しを追跡
    const visibleHeadings = new Map<string, Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visibleHeadings.set(id, entry.target);
          } else {
            visibleHeadings.delete(id);
          }
        }

        // ビューポート内の見出しから最上部のものを選択
        if (visibleHeadings.size > 0) {
          let topMostId: string | null = null;
          let topMostTop = Number.POSITIVE_INFINITY;

          for (const [id, element] of visibleHeadings) {
            const rect = element.getBoundingClientRect();
            if (rect.top < topMostTop) {
              topMostTop = rect.top;
              topMostId = id;
            }
          }

          if (topMostId) {
            setActiveId(topMostId);
          }
        }
      },
      {
        // デフォルト: 上部80px、下部80%をマージン（ヘッダー高さ考慮）
        rootMargin: options?.rootMargin ?? "-80px 0px -80% 0px",
        threshold: options?.threshold ?? 0,
      },
    );

    // 各見出し要素を監視
    for (const id of headingIds) {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    }

    const updateActiveAtPageEnd = () => {
      const viewportBottom = Math.ceil(window.scrollY + window.innerHeight);
      const pageBottom = document.documentElement.scrollHeight;
      const lastHeadingId = headingIds[headingIds.length - 1];
      if (viewportBottom >= pageBottom - 1 && lastHeadingId) {
        setActiveId(lastHeadingId);
      }
    };

    window.addEventListener("scroll", updateActiveAtPageEnd, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateActiveAtPageEnd);
    };
  }, [headingIds, options?.rootMargin, options?.threshold]);

  return { activeId };
}
