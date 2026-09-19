import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enhanceArticleCodeBlocks } from "@/lib/articleCode";

function setClipboard(writeText: ReturnType<typeof vi.fn>): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("enhanceArticleCodeBlocks", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("言語付きコードを言語表示・コピー操作・完了通知で拡張する", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    document.body.innerHTML = `
      <article id="root">
        <pre data-language="ts"><code>const answer = 42;</code></pre>
      </article>
    `;

    const root = document.querySelector("#root");
    if (!root) throw new Error("テスト対象のrootがありません");

    enhanceArticleCodeBlocks(root);

    const example = root.querySelector(".article-code-example");
    const pre = example?.querySelector("pre");
    const language = example?.querySelector(".article-code-language");
    const button = example?.querySelector<HTMLButtonElement>(".copy-button");
    const status = example?.querySelector<HTMLElement>("[data-copy-status]");

    expect(example).toBeInstanceOf(HTMLDivElement);
    expect(pre?.dataset.articleCodeEnhanced).toBe("true");
    expect(language).toHaveTextContent("TypeScript");
    expect(language).toHaveAttribute("aria-label", "コードの言語");
    expect(button).toHaveAttribute("aria-label", "コードをコピー");
    expect(status).toHaveAttribute("aria-live", "polite");

    button?.click();
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith("const answer = 42;");
    expect(button).toHaveClass("copied");
    expect(button).toHaveAttribute("aria-label", "コピーしました");
    expect(status).toHaveTextContent("コードをコピーしました");

    await vi.advanceTimersByTimeAsync(2000);

    expect(button).not.toHaveClass("copied");
    expect(button).toHaveAttribute("aria-label", "コードをコピー");
    expect(status).toBeEmptyDOMElement();

    enhanceArticleCodeBlocks(root);
    expect(root.querySelectorAll(".article-code-example")).toHaveLength(1);
  });

  it("デザインシステムの標本面を再利用し、未知の言語名はそのまま表示する", () => {
    document.body.innerHTML = `
      <div id="root">
        <div class="demo"><pre data-language="custom"><code>sample</code></pre></div>
        <pre><code>plain</code></pre>
      </div>
    `;

    const root = document.querySelector("#root");
    if (!root) throw new Error("テスト対象のrootがありません");

    enhanceArticleCodeBlocks(root);

    const demo = root.querySelector(".demo");
    expect(demo).toHaveClass("article-code-example");
    expect(demo?.querySelector(".article-code-language")).toHaveTextContent("custom");
    expect(root.querySelectorAll(".article-code-example")).toHaveLength(1);
    expect(
      root.querySelector<HTMLElement>("pre:not([data-language])")?.dataset.articleCodeEnhanced,
    ).toBeUndefined();
  });

  it("クリップボードへ書き込めない場合は回復可能な失敗を通知する", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    setClipboard(writeText);
    document.body.innerHTML = `
      <pre data-language="shell">pnpm test</pre>
    `;

    enhanceArticleCodeBlocks();

    const button = document.querySelector<HTMLButtonElement>(".copy-button");
    const status = document.querySelector<HTMLElement>("[data-copy-status]");
    button?.click();
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith("pnpm test");
    expect(button).toHaveAttribute("aria-label", "コピーできませんでした");
    expect(status).toHaveTextContent("コードをコピーできませんでした");
  });
});
