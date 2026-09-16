import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
}

interface PagefindResult {
  id: string;
  data: () => Promise<{
    url: string;
    meta: { title: string };
    excerpt: string;
  }>;
}

interface PagefindResponse {
  results: PagefindResult[];
  totalFilters: Record<string, Record<string, number>>;
}

interface Pagefind {
  init: () => Promise<void>;
  search: (query: string) => Promise<PagefindResponse>;
}

const RESULTS_PER_PAGE = 5;

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(RESULTS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const pagefindRef = useRef<Pagefind | null>(null);
  const allResultsRef = useRef<PagefindResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (pf: Pagefind, searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalCount(0);
      setHasSearched(false);
      allResultsRef.current = [];
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setDisplayCount(RESULTS_PER_PAGE);

    const response = await pf.search(searchQuery);
    allResultsRef.current = response.results;
    setTotalCount(response.results.length);

    const loaded = await Promise.all(
      response.results.slice(0, RESULTS_PER_PAGE).map((r) => r.data()),
    );
    setResults(
      loaded.map((d) => ({
        url: d.url,
        title: d.meta.title,
        excerpt: d.excerpt,
      })),
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function loadPagefind() {
      try {
        // ビルド時にRollupが解決しないよう、動的にimportパスを構築
        const pagefindPath = "/pagefind/pagefind.js";
        const pf = await import(/* @vite-ignore */ pagefindPath);
        await pf.init();
        pagefindRef.current = pf;

        const params = new URLSearchParams(window.location.search);
        const q = params.get("q");
        if (q) {
          setQuery(q);
          performSearch(pf, q);
        }
      } catch {
        // pagefind not available (dev mode)
      }
    }
    loadPagefind();
  }, [performSearch]);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      if (pagefindRef.current) {
        performSearch(pagefindRef.current, value);
      }
    },
    [performSearch],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setTotalCount(0);
    setHasSearched(false);
    allResultsRef.current = [];
    inputRef.current?.focus();
  }, []);

  const handleLoadMore = useCallback(async () => {
    const nextCount = displayCount + RESULTS_PER_PAGE;
    const loaded = await Promise.all(
      allResultsRef.current.slice(displayCount, nextCount).map((r) => r.data()),
    );
    setResults((prev) => [
      ...prev,
      ...loaded.map((d) => ({
        url: d.url,
        title: d.meta.title,
        excerpt: d.excerpt,
      })),
    ]);
    setDisplayCount(nextCount);
  }, [displayCount]);

  return (
    <search>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleInput}
            aria-label="記事を検索"
            placeholder="キーワードを入力"
            className={cn(
              "h-9 w-full rounded-md border border-border bg-muted pl-8 pr-3",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "transition-colors focus:border-muted-foreground focus:outline-none",
              "focus:ring-1 focus:ring-ring/15",
            )}
          />
        </div>
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "h-9 rounded-md border border-border px-3",
            "text-sm text-muted-foreground",
            "transition-colors hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          )}
        >
          検索条件をクリア
        </button>
      </div>

      {hasSearched && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "検索中..."
              : totalCount > 0
                ? `${totalCount}件の検索結果`
                : "検索結果が見つかりませんでした"}
          </p>

          {results.length > 0 && (
            <ol className="mt-3 space-y-0">
              {results.map((result) => (
                <li key={result.url} className="border-t border-border py-4 first:border-t-0">
                  <a
                    href={result.url}
                    className="text-link text-sm font-semibold transition-colors hover:text-link-hover"
                  >
                    {result.title}
                  </a>
                  <p
                    className="mt-1 text-sm text-muted-foreground line-clamp-2"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: pagefind excerptはビルド時生成のHTMLでユーザー入力を含まない
                    dangerouslySetInnerHTML={{ __html: result.excerpt }}
                  />
                </li>
              ))}
            </ol>
          )}

          {displayCount < totalCount && (
            <button
              type="button"
              onClick={handleLoadMore}
              className={cn(
                "mt-4 h-9 w-full rounded-md border border-border",
                "text-sm font-medium text-muted-foreground",
                "transition-colors hover:bg-accent hover:text-accent-foreground",
              )}
            >
              もっと見る
            </button>
          )}
        </div>
      )}
    </search>
  );
}
