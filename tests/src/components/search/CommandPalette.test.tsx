/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "@/components/search/CommandPalette";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});

describe("CommandPalette", () => {
  it("検索入力フィールドが存在する", () => {
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText("記事を検索...")).toBeInTheDocument();
  });

  it("初期状態で検索ヒントが表示される", () => {
    render(<CommandPalette />);
    expect(screen.getByText("キーワードを入力して検索")).toBeInTheDocument();
  });

  it("Escキーバッジが表示される", () => {
    render(<CommandPalette />);
    expect(screen.getByText("Esc")).toBeInTheDocument();
  });

  it("⌘Kでダイアログが開く", () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("Ctrl+Kでダイアログが開く", () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("ダイアログが開いている状態で⌘Kを押すと閉じる", () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it("検索入力にcomboboxロールが設定されている", () => {
    render(<CommandPalette />);
    const input = screen.getByRole("combobox", { hidden: true });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-controls", "command-palette-results");
  });

  it("結果リストにlistboxロールが設定されている", () => {
    render(<CommandPalette />);
    const listbox = screen.getByRole("listbox", { hidden: true });
    expect(listbox).toBeInTheDocument();
  });
});
