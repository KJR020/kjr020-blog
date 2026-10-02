import Giscus from "@giscus/react";
import { useEffect, useState } from "react";

interface CommentsProps {
  repo: `${string}/${string}`;
  repoId: string;
  category: string;
  categoryId: string;
}

export function Comments({ repo, repoId, category, categoryId }: CommentsProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // 初期テーマを判定
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    // MutationObserverでテーマ変更を監視
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          const isDarkNow = document.documentElement.classList.contains("dark");
          setTheme(isDarkNow ? "dark" : "light");
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // 設定が不完全な場合は何も表示しない
  if (!repo || !repoId || !category || !categoryId) {
    console.warn("Giscus configuration is incomplete");
    return null;
  }

  return (
    <section aria-labelledby="comments-title">
      <h2 id="comments-title" className="mb-6 text-xl font-bold">
        コメント
      </h2>
      <Giscus
        repo={repo}
        repoId={repoId}
        category={category}
        categoryId={categoryId}
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="1"
        inputPosition="top"
        theme={theme}
        lang="ja"
        loading="lazy"
      />
    </section>
  );
}
