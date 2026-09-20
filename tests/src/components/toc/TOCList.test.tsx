import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOCList } from "@/components/toc/TOCList";

const headings = [
  { id: "first", text: "最初の見出し", level: 2 as const },
  { id: "second", text: "次の見出し", level: 2 as const },
];

function createRect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 200,
    width: 200,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("TOCList", () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

  afterEach(() => {
    if (originalScrollIntoView) {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });

  it("現在位置の更新ではページを動かさず、目次の内部だけをスクロールする", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    const { container, rerender } = render(
      <div data-toc-scroll-container="true">
        <TOCList headings={headings} activeId="first" />
      </div>,
    );
    const scrollContainer = container.firstElementChild as HTMLElement;
    const secondItem = container.querySelector('a[href="#second"]')?.parentElement;
    if (!secondItem) throw new Error("second item not found");

    const scrollBy = vi.fn();
    Object.defineProperty(scrollContainer, "scrollBy", {
      configurable: true,
      value: scrollBy,
    });
    vi.spyOn(scrollContainer, "getBoundingClientRect").mockReturnValue(createRect(0, 100));
    vi.spyOn(secondItem, "getBoundingClientRect").mockReturnValue(createRect(120, 140));

    rerender(
      <div data-toc-scroll-container="true">
        <TOCList headings={headings} activeId="second" />
      </div>,
    );

    await waitFor(() => {
      expect(scrollBy).toHaveBeenCalledWith({ behavior: "smooth", top: 40 });
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
