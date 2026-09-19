import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useImageLazyLoad } from "@/components/scrapbox/useImageLazyLoad";

class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  private observedElements = new Set<Element>();
  readonly options?: IntersectionObserverInit;
  static instances: MockIntersectionObserver[] = [];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observedElements.add(element);
  }

  disconnect() {
    this.observedElements.clear();
  }

  trigger(entry: Partial<IntersectionObserverEntry>) {
    const target = entry.target ?? document.createElement("img");
    this.callback(
      [
        {
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 0,
          intersectionRect: {} as DOMRectReadOnly,
          isIntersecting: false,
          rootBounds: null,
          target,
          time: Date.now(),
          ...entry,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

function LazyImageProbe(props: { rootMargin?: string; threshold?: number }) {
  const { ref, isInView, isLoaded, onLoad } = useImageLazyLoad(props);

  return (
    <>
      <img alt="lazy target" data-testid="target" onLoad={onLoad} ref={ref} />
      <output aria-label="in-view">{String(isInView)}</output>
      <output aria-label="loaded">{String(isLoaded)}</output>
    </>
  );
}

describe("useImageLazyLoad", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("デフォルト設定で画像を監視し、交差したらin-viewになる", () => {
    render(<LazyImageProbe />);

    const observer = MockIntersectionObserver.instances[0];
    expect(observer.options).toMatchObject({
      rootMargin: "200px",
      threshold: 0.1,
    });

    act(() => {
      observer.trigger({
        isIntersecting: true,
        target: screen.getByTestId("target"),
      });
    });

    expect(screen.getByLabelText("in-view")).toHaveTextContent("true");
  });

  it("カスタム設定をIntersectionObserverに渡す", () => {
    render(<LazyImageProbe rootMargin="50px" threshold={0.5} />);

    expect(MockIntersectionObserver.instances[0].options).toMatchObject({
      rootMargin: "50px",
      threshold: 0.5,
    });
  });

  it("画像のloadイベントでloadedになる", () => {
    render(<LazyImageProbe />);

    act(() => {
      screen.getByTestId("target").dispatchEvent(new Event("load", { bubbles: true }));
    });

    expect(screen.getByLabelText("loaded")).toHaveTextContent("true");
  });

  it("アンマウント時にobserverを切断する", () => {
    const { unmount } = render(<LazyImageProbe />);
    const disconnectSpy = vi.spyOn(MockIntersectionObserver.instances[0], "disconnect");

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });
});
