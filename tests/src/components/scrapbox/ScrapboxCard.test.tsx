import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrapboxCard } from "@/components/scrapbox/ScrapboxCard";
import type { ScrapboxPageData } from "@/components/scrapbox/types";

class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  static instances: MockIntersectionObserver[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe() {}

  disconnect() {}

  trigger(entry: Partial<IntersectionObserverEntry>) {
    this.callback(
      [
        {
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 0,
          intersectionRect: {} as DOMRectReadOnly,
          isIntersecting: false,
          rootBounds: null,
          target: document.createElement("img"),
          time: Date.now(),
          ...entry,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

function page(overrides?: Partial<ScrapboxPageData>): ScrapboxPageData {
  return {
    id: "page-1",
    title: "Scrapbox note",
    imageUrl: "https://example.com/image.png",
    description: "A linked note",
    updatedAt: "2026-05-05T00:00:00Z",
    url: "https://scrapbox.io/example/page-1",
    ...overrides,
  };
}

describe("ScrapboxCard", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("画像がビューポートに入るまでsrcを遅延し、交差後に画像URLを設定する", () => {
    render(<ScrapboxCard page={page()} />);

    const image = screen.getByAltText("Scrapbox note");
    expect(image).not.toHaveAttribute("src");

    act(() => {
      MockIntersectionObserver.instances[0].trigger({
        isIntersecting: true,
        target: image,
      });
    });

    expect(image).toHaveAttribute("src", "https://example.com/image.png");
  });

  it("画像URLがない場合はプレースホルダーを表示する", () => {
    render(<ScrapboxCard page={page({ imageUrl: null })} />);

    expect(screen.getByTestId("image-placeholder")).toBeInTheDocument();
    expect(screen.queryByAltText("Scrapbox note")).not.toBeInTheDocument();
  });
});
