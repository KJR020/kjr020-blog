import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PagefindResultData {
  url: string;
  meta: { title: string };
  excerpt: string;
}

interface PagefindResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}

interface PagefindResponse {
  results: PagefindResult[];
}

interface Pagefind {
  search: (query: string) => Promise<PagefindResponse>;
}

interface SearchResultItem {
  url: string;
  title: string;
  excerpt: string;
}

const PAGEFIND_PATH = "/pagefind/pagefind.js";

export function CommandPalette() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pagefindRef = useRef<Pagefind | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pagefindError, setPagefindError] = useState(false);

  const loadPagefind = useCallback(async (): Promise<Pagefind | null> => {
    if (pagefindRef.current) return pagefindRef.current;
    try {
      const pf = (await import(/* @vite-ignore */ PAGEFIND_PATH)) as unknown as Pagefind;
      pagefindRef.current = pf;
      return pf;
    } catch {
      setPagefindError(true);
      return null;
    }
  }, []);

  const openDialog = useCallback(() => {
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
    setTimeout(() => inputRef.current?.focus(), 0);
    loadPagefind();
  }, [loadPagefind]);

  useEffect(() => {
    const handleTriggerClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-command-palette-trigger]")) {
        openDialog();
      }
    };

    document.addEventListener("click", handleTriggerClick);

    if (new URLSearchParams(window.location.search).get("search") === "open") {
      openDialog();
    }

    return () => document.removeEventListener("click", handleTriggerClick);
  }, [openDialog]);

  // Reset state on dialog close (handles Escape, backdrop click, programmatic close)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    };

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (dialogRef.current?.open) {
          dialogRef.current.close();
        } else {
          openDialog();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openDialog]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      const pf = await loadPagefind();
      if (!pf) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await pf.search(query);
        const data = await Promise.all(response.results.slice(0, 8).map((r) => r.data()));
        setResults(
          data.map((d) => ({
            url: d.url,
            title: d.meta.title,
            excerpt: d.excerpt,
          })),
        );
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [query, loadPagefind]);

  // Scroll active result into view
  useEffect(() => {
    const el = document.getElementById(`command-palette-result-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[activeIndex]) {
          window.location.href = results[activeIndex].url;
        }
        break;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      dialogRef.current.close();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      className="command-palette-dialog mx-auto mt-[15vh] mb-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-border bg-background p-0 text-foreground shadow-lg"
    >
      <div className="flex flex-col">
        <div className="flex items-center border-b border-border px-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 shrink-0 text-muted-foreground"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="記事を検索"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-activedescendant={
              results.length > 0 ? `command-palette-result-${activeIndex}` : undefined
            }
            aria-expanded={results.length > 0}
            placeholder="記事を検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="ml-2 shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div
          id="command-palette-results"
          role="listbox"
          className="max-h-[50vh] overflow-y-auto p-2"
        >
          {pagefindError && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              検索インデックスを読み込めませんでした
            </div>
          )}
          {!pagefindError && isLoading && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">検索中...</div>
          )}
          {!pagefindError && !isLoading && query.trim() && results.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              検索結果が見つかりませんでした
            </div>
          )}
          {!pagefindError &&
            !isLoading &&
            results.map((result, index) => (
              <div
                key={result.url}
                id={`command-palette-result-${index}`}
                role="option"
                tabIndex={-1}
                aria-selected={index === activeIndex}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-2 text-sm",
                  index === activeIndex ? "bg-accent text-accent-foreground" : "text-foreground",
                )}
                onClick={() => {
                  window.location.href = result.url;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") window.location.href = result.url;
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <div className="font-medium">{result.title}</div>
                <div
                  className="mt-0.5 line-clamp-1 text-xs text-muted-foreground"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Pagefind excerpts contain <mark> tags for search highlighting
                  dangerouslySetInnerHTML={{ __html: result.excerpt }}
                />
              </div>
            ))}
          {!pagefindError && !isLoading && !query.trim() && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              キーワードを入力して検索
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
