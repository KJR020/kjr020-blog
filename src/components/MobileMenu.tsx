import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LinkNavItem {
  href: string;
  label: string;
  external?: boolean;
  action?: never;
}

interface ActionNavItem {
  action: "search";
  label: string;
  href?: never;
  external?: never;
}

type NavItem = LinkNavItem | ActionNavItem;

interface MobileMenuProps {
  navItems: NavItem[];
  /** 現在のパス。Headerと同じ規則で現在地を示す */
  currentPath?: string;
}

const itemClassName =
  "flex min-h-11 items-center rounded-md px-3 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

function isCurrent(href: string, currentPath: string | undefined): boolean {
  if (currentPath === undefined) return false;
  if (href === "/") return currentPath === "/";
  return currentPath.startsWith(href);
}

export function MobileMenu({ navItems, currentPath }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // メニュー外クリックとEscapeキーでメニューを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  return (
    <div ref={menuRef} className="relative md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMenu}
        aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={isOpen}
      >
        {/* ハンバーガーアイコン */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {isOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </>
          )}
        </svg>
      </Button>

      {/* ナビゲーションメニュー - コンパクトなドロップダウン */}
      {isOpen && (
        <nav className="fixed inset-x-4 top-[calc(var(--spacing-phi-2xl)+var(--spacing-phi-2xs))] z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-(--shadow-overlay)">
          <div className="flex flex-col gap-px p-phi-2xs">
            {navItems.map((item) =>
              item.action === "search" ? (
                <button
                  key={item.action}
                  type="button"
                  data-command-palette-trigger
                  onClick={closeMenu}
                  className={itemClassName}
                >
                  {item.label}
                </button>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  onClick={closeMenu}
                  aria-current={isCurrent(item.href, currentPath) ? "page" : undefined}
                  className={cn(
                    itemClassName,
                    "aria-[current=page]:font-semibold aria-[current=page]:text-link",
                  )}
                >
                  {item.label}
                  {item.external && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="ml-1 text-muted-foreground"
                      aria-hidden="true"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" x2="21" y1="14" y2="3" />
                    </svg>
                  )}
                </a>
              ),
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
