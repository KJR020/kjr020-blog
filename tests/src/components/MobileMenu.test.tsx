/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileMenu } from "@/components/MobileMenu";

const mockNavItems = [
  { href: "/", label: "Home" },
  { href: "/posts", label: "Posts" },
  { action: "search" as const, label: "Search" },
  { href: "https://scrapbox.io/kjr020/", label: "Scrapbox", external: true },
];

describe("MobileMenu", () => {
  describe("ハンバーガーボタン", () => {
    it("初期状態でハンバーガーアイコンが表示される", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toBeInTheDocument();
    });

    it("aria-expandedが初期状態でfalse", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("クリックでメニューが開きaria-expandedがtrueになる", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      const button = screen.getByRole("button", { name: /メニューを開く/ });

      fireEvent.click(button);

      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(button).toHaveAttribute("aria-label", "メニューを閉じる");
    });

    it("再度クリックでメニューが閉じる", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      const button = screen.getByRole("button", { name: /メニューを開く/ });

      fireEvent.click(button);
      fireEvent.click(button);

      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-label", "メニューを開く");
    });
  });

  describe("ナビゲーションリンク", () => {
    it("メニューが閉じている状態ではナビゲーションリンクが非表示", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    });

    it("メニューを開くとナビゲーションリンクが表示される", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      const button = screen.getByRole("button", { name: /メニューを開く/ });

      fireEvent.click(button);

      expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Posts" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Scrapbox/ })).toBeInTheDocument();
    });

    it("外部リンクにはtarget=_blankが設定される", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      const button = screen.getByRole("button", { name: /メニューを開く/ });

      fireEvent.click(button);

      const externalLink = screen.getByRole("link", { name: /Scrapbox/ });
      expect(externalLink).toHaveAttribute("target", "_blank");
      expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("現在地", () => {
    it.each([
      ["/", "Home"],
      ["/posts", "Posts"],
      ["/posts/astro/example", "Posts"],
    ])("%s では%sをaria-current=pageで示す", (currentPath, currentLabel) => {
      render(<MobileMenu navItems={mockNavItems} currentPath={currentPath} />);
      fireEvent.click(screen.getByRole("button", { name: /メニューを開く/ }));

      for (const label of ["Home", "Posts"]) {
        const link = screen.getByRole("link", { name: label });
        if (label === currentLabel) {
          expect(link).toHaveAttribute("aria-current", "page");
        } else {
          expect(link).not.toHaveAttribute("aria-current");
        }
      }
    });

    it("currentPathがなければどの項目も現在地にしない", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      fireEvent.click(screen.getByRole("button", { name: /メニューを開く/ }));

      expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    });
  });

  describe("メニュー自動閉じ", () => {
    it("リンクをクリックするとメニューが閉じる", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      const button = screen.getByRole("button", { name: /メニューを開く/ });

      fireEvent.click(button);
      const homeLink = screen.getByRole("link", { name: "Home" });
      fireEvent.click(homeLink);

      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("Escapeキーを押すとメニューが閉じる", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      const button = screen.getByRole("button", { name: /メニューを開く/ });

      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");

      fireEvent.keyDown(document, { key: "Escape" });

      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("メニュー外をクリックするとメニューが閉じる", () => {
      render(<MobileMenu navItems={mockNavItems} />);
      const button = screen.getByRole("button", { name: /メニューを開く/ });

      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");

      fireEvent.mouseDown(document.body);

      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });
});
