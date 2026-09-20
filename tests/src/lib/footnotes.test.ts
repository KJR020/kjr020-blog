import { beforeEach, describe, expect, it } from "vitest";
import { enhanceFootnotes } from "@/lib/footnotes";

describe("enhanceFootnotes", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("脚注参照にプレビューを付け、復帰リンクの読み上げ名を明確にする", () => {
    document.body.innerHTML = `
      <article class="prose" id="root">
        <p>
          本文
          <sup><a id="footnote-reference-custom" data-footnote-ref href="#footnote-1" aria-describedby="footnote-label">1</a></sup>
        </p>
        <section>
          <ol>
            <li id="footnote-1">脚注の説明 <a data-footnote-backref href="#footnote-reference-custom">戻る</a></li>
          </ol>
        </section>
      </article>
    `;

    const root = document.querySelector("#root");
    if (!root) throw new Error("テスト対象のrootがありません");

    enhanceFootnotes(root);

    const reference = root.querySelector<HTMLAnchorElement>("[data-footnote-ref]");
    const wrapper = reference?.parentElement;
    const preview = wrapper?.querySelector(".footnote-preview");
    const backReference = root.querySelector("[data-footnote-backref]");

    expect(wrapper).toHaveAttribute("id", "footnote-reference-custom");
    expect(wrapper).toHaveClass("footnote-reference");
    expect(reference).not.toHaveAttribute("id");
    expect(reference?.dataset.footnoteEnhanced).toBe("true");
    expect(preview).toHaveAttribute("id", "footnote-reference-custom-preview");
    expect(preview).toHaveAttribute("role", "tooltip");
    expect(preview).toHaveTextContent("脚注の説明");
    expect(preview).not.toHaveTextContent("戻る");
    expect(reference).toHaveAttribute(
      "aria-describedby",
      "footnote-label footnote-reference-custom-preview",
    );
    expect(backReference).toHaveAttribute("aria-label", "本文の参照位置へ戻る");

    enhanceFootnotes(root);
    expect(root.querySelectorAll(".footnote-preview")).toHaveLength(1);
  });

  it("参照IDがない場合は生成し、参照先がなくても安全に処理する", () => {
    document.body.innerHTML = `
      <article class="prose" id="root">
        <p><sup><a data-footnote-ref href="#missing">1</a></sup></p>
        <p><a data-footnote-ref href="#missing">sup外の参照</a></p>
        <a data-footnote-backref href="#missing">戻る</a>
      </article>
    `;

    const root = document.querySelector("#root");
    if (!root) throw new Error("テスト対象のrootがありません");

    enhanceFootnotes(root);

    const references = root.querySelectorAll<HTMLAnchorElement>("[data-footnote-ref]");
    expect(references[0]?.parentElement).toHaveAttribute("id", "footnote-reference-1");
    expect(references[0]?.parentElement?.querySelector(".footnote-preview")).toBeNull();
    expect(references[1]?.dataset.footnoteEnhanced).toBeUndefined();
    expect(root.querySelector("[data-footnote-backref]")).toHaveAttribute(
      "aria-label",
      "本文の参照位置へ戻る",
    );
  });

  it("既存のaria-describedbyがなくてもプレビューだけを関連付ける", () => {
    document.body.innerHTML = `
      <article class="prose" id="root">
        <p><sup><a data-footnote-ref href="#footnote-1">1</a></sup></p>
        <ol><li id="footnote-1">短い脚注</li></ol>
      </article>
    `;

    const root = document.querySelector("#root");
    if (!root) throw new Error("テスト対象のrootがありません");

    enhanceFootnotes(root);

    expect(root.querySelector("[data-footnote-ref]")).toHaveAttribute(
      "aria-describedby",
      "footnote-reference-1-preview",
    );
  });
});
