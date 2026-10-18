/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { type ComponentType, useEffect, useState } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { withStrictMode } from "@/components/withStrictMode";

// tests/setup.tsはテスト全体をルートでStrict Modeにする。
// withStrictMode自体の効果を確かめるため、ここではルートのStrict Modeを外して描画する
function renderIsland(Island: ComponentType, { hydrate }: { hydrate: boolean }) {
  if (!hydrate) {
    return render(<Island />, { reactStrictMode: false });
  }
  // client:loadのアイランドと同じく、サーバーで描画したHTMLを引き継ぐ
  const container = document.createElement("div");
  container.innerHTML = renderToString(<Island />);
  document.body.append(container);
  return render(<Island />, { container, hydrate: true, reactStrictMode: false });
}

describe("withStrictMode", () => {
  it("受け取ったpropsで中身の部品を描画する", () => {
    const Greeting = withStrictMode(({ name }: { name: string }) => <p>{name}さん</p>);

    render(<Greeting name="クリッち" />, { reactStrictMode: false });

    expect(screen.getByText("クリッちさん")).toBeInTheDocument();
  });

  describe.each([
    { directive: "client:only", hydrate: false },
    { directive: "client:load", hydrate: true },
  ])("$directiveのアイランド", ({ hydrate }) => {
    it("開発時は中身の部品の描画を2回呼ぶ", () => {
      const renderSpy = vi.fn();
      const Island = withStrictMode(() => {
        renderSpy();
        return <p>probe</p>;
      });

      renderIsland(Island, { hydrate });

      // ハイドレーションでは、サーバー側の描画の呼び出しも数に含まれる
      expect(renderSpy).toHaveBeenCalledTimes(hydrate ? 3 : 2);
    });

    it("後から現れた部品のeffectを開始・停止・開始の順に走らせる", () => {
      const calls: string[] = [];
      let showPanel = () => {};
      function Panel() {
        useEffect(() => {
          calls.push("開始");
          return () => {
            calls.push("停止");
          };
        }, []);
        return <p>panel</p>;
      }
      const Island = withStrictMode(() => {
        const [isOpen, setIsOpen] = useState(false);
        showPanel = () => setIsOpen(true);
        return <div>{isOpen && <Panel />}</div>;
      });

      renderIsland(Island, { hydrate });
      act(() => showPanel());

      expect(calls).toEqual(["開始", "停止", "開始"]);
    });
  });

  it("開発ツールで見分けられるよう、中身の部品名を表示名に含める", () => {
    function TableOfContentsInner() {
      return null;
    }

    expect(withStrictMode(TableOfContentsInner).displayName).toBe(
      "withStrictMode(TableOfContentsInner)",
    );
  });
});
