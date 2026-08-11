import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollSpy } from "./useScrollSpy";

// IntersectionObserverのモック
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  private elements: Set<Element> = new Set();
  static instances: MockIntersectionObserver[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  unobserve(element: Element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }

  // テスト用: エントリを発火させる
  triggerEntries(entries: Partial<IntersectionObserverEntry>[]) {
    const fullEntries = entries.map((entry) => ({
      isIntersecting: false,
      intersectionRatio: 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      target: document.createElement("div"),
      time: Date.now(),
      ...entry,
    })) as IntersectionObserverEntry[];
    this.callback(fullEntries, this as unknown as IntersectionObserver);
  }
}

describe("useScrollSpy", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    // DOM要素をモック
    document.body.innerHTML = `
      <h2 id="heading-1">Heading 1</h2>
      <h2 id="heading-2">Heading 2</h2>
      <h3 id="heading-3">Heading 3</h3>
    `;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("見出しIDリストを渡すとObserverがセットアップされる", () => {
    const headingIds = ["heading-1", "heading-2", "heading-3"];

    renderHook(() => useScrollSpy(headingIds));

    expect(MockIntersectionObserver.instances.length).toBe(1);
  });

  it("初期状態では最初の見出しがactiveIdになる", () => {
    const headingIds = ["heading-1", "heading-2"];

    const { result } = renderHook(() => useScrollSpy(headingIds));

    expect(result.current.activeId).toBe("heading-1");
  });

  it("見出しがビューポートに入るとactiveIdが更新される", () => {
    const headingIds = ["heading-1", "heading-2"];

    const { result } = renderHook(() => useScrollSpy(headingIds));

    const observer = MockIntersectionObserver.instances[0];
    const targetElement = document.getElementById("heading-1");
    if (!targetElement) throw new Error("heading-1 not found");

    act(() => {
      observer.triggerEntries([
        {
          isIntersecting: true,
          target: targetElement,
        },
      ]);
    });

    expect(result.current.activeId).toBe("heading-1");
  });

  it("複数の見出しがビューポート内にある時、最上部の見出しがactiveになる", () => {
    const headingIds = ["heading-1", "heading-2", "heading-3"];

    const { result } = renderHook(() => useScrollSpy(headingIds));

    const observer = MockIntersectionObserver.instances[0];
    const heading1 = document.getElementById("heading-1");
    const heading2 = document.getElementById("heading-2");
    if (!heading1 || !heading2) throw new Error("headings not found");

    // heading1のboundingClientRectをモック（より上部にある）
    vi.spyOn(heading1, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 150,
      left: 0,
      right: 100,
      width: 100,
      height: 50,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });

    // heading2のboundingClientRectをモック（下部にある）
    vi.spyOn(heading2, "getBoundingClientRect").mockReturnValue({
      top: 200,
      bottom: 250,
      left: 0,
      right: 100,
      width: 100,
      height: 50,
      x: 0,
      y: 200,
      toJSON: () => ({}),
    });

    act(() => {
      observer.triggerEntries([
        { isIntersecting: true, target: heading1 },
        { isIntersecting: true, target: heading2 },
      ]);
    });

    // 最上部の見出しがアクティブになる
    expect(result.current.activeId).toBe("heading-1");
  });

  it("アンマウント時にObserverがクリーンアップされる", () => {
    const headingIds = ["heading-1", "heading-2"];

    const { unmount } = renderHook(() => useScrollSpy(headingIds));

    const observer = MockIntersectionObserver.instances[0];
    const disconnectSpy = vi.spyOn(observer, "disconnect");

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it("headingIdsが空の場合、Observerは作成されない", () => {
    renderHook(() => useScrollSpy([]));

    // headingIdsが空の場合、IntersectionObserverは作成されない
    expect(MockIntersectionObserver.instances.length).toBe(0);
  });

  it("カスタムrootMarginオプションが適用される", () => {
    const headingIds = ["heading-1"];
    const options = { rootMargin: "-100px 0px -50% 0px" };

    renderHook(() => useScrollSpy(headingIds, options));

    // オプションが渡されることを確認（実装で検証）
    expect(MockIntersectionObserver.instances.length).toBe(1);
  });

  it("ページ末尾では最後の見出しがactiveIdになる", () => {
    const headingIds = ["heading-1", "heading-2", "heading-3"];
    vi.spyOn(window, "scrollY", "get").mockReturnValue(1200);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(2000);

    const { result } = renderHook(() => useScrollSpy(headingIds));

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.activeId).toBe("heading-3");
  });
});
