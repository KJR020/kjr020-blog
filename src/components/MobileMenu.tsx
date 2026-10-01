import { useCallback, useEffect, useRef, useState } from "react";
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
  currentPath?: string;
}

function isCurrent(href: string, currentPath?: string) {
  if (!currentPath) return false;
  if (href === "/") return currentPath === "/";
  return currentPath.startsWith(href);
}

const itemClassName =
  "group flex w-full items-baseline gap-4 border-b border-border py-4 text-left text-foreground transition-colors hover:text-link focus-visible:text-link";

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

    // 背景の幕はメニューの外側として扱う
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isBackdrop = target instanceof Element && target.closest(".mobile-menu-backdrop");
      if (isBackdrop || (menuRef.current && !menuRef.current.contains(target))) {
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
    <div ref={menuRef} className="md:hidden">
      <button
        type="button"
        onClick={toggleMenu}
        aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={isOpen}
        className="relative z-10 inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
      >
        <span aria-hidden="true" className="relative block h-3 w-5">
          <span
            className={cn(
              "absolute left-0 block h-[1.5px] w-5 rounded-full bg-current transition-transform duration-300 ease-[var(--ease-out)]",
              isOpen ? "top-[5px] rotate-45" : "top-0",
            )}
          />
          <span
            className={cn(
              "absolute left-0 block h-[1.5px] w-5 rounded-full bg-current transition-transform duration-300 ease-[var(--ease-out)]",
              isOpen ? "top-[5px] -rotate-45" : "top-[10px]",
            )}
          />
        </span>
      </button>

      {isOpen && (
        <div
          aria-hidden="true"
          className="mobile-menu-backdrop fixed inset-x-0 bottom-0 top-[var(--header-height)] z-40 bg-foreground/20 backdrop-blur-[2px]"
        />
      )}
      {isOpen && (
        <nav
          aria-label="サイト"
          className="mobile-menu-panel fixed inset-x-0 top-[var(--header-height)] z-50 max-h-[calc(100dvh-var(--header-height))] overflow-y-auto border-y border-border bg-background px-[var(--shell-pad)] pb-6"
        >
          <ul className="flex flex-col">
            {navItems.map((item, index) => {
              return (
                <li
                  key={item.href ?? item.action}
                  className="mobile-menu-item"
                  style={{ animationDelay: `${60 + index * 50}ms` }}
                >
                  {item.action === "search" ? (
                    <button
                      type="button"
                      data-command-palette-trigger
                      onClick={closeMenu}
                      className={itemClassName}
                    >
                      <span className="text-3xl font-extrabold leading-none tracking-tight">
                        {item.label}
                      </span>
                    </button>
                  ) : (
                    <a
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      aria-current={
                        !item.external && isCurrent(item.href, currentPath) ? "page" : undefined
                      }
                      onClick={closeMenu}
                      className={cn(itemClassName, "aria-[current=page]:text-link")}
                    >
                      <span className="text-3xl font-extrabold leading-none tracking-tight">
                        {item.label}
                      </span>
                      {item.external && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="self-center text-muted-foreground"
                          aria-hidden="true"
                        >
                          <path d="M7 17 17 7" />
                          <path d="M8 7h9v9" />
                        </svg>
                      )}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
