import { describe, expect, it } from "vitest";
import { createExcerpt, toPlainText } from "@/lib/postSummary";

describe("toPlainText", () => {
  it.each([
    ["見出し記号", "## 見出し", "見出し"],
    ["リンク", "[Astro](https://astro.build)の話", "Astroの話"],
    ["画像", "前![alt](/a.png)後", "前 後"],
    ["強調とインラインコード", "**太字**と`code`", "太字とcode"],
    ["コードブロック", "前\n```ts\nconst a = 1;\n```\n後", "前 後"],
    ["脚注参照", "本文[^1]です", "本文 です"],
    ["Callout記号", "> [!note] メモ\n> 内容", "内容"],
  ])("%sを取り除く", (_, input, expected) => {
    expect(toPlainText(input)).toBe(expected);
  });
});

describe("createExcerpt", () => {
  it("上限以下ならそのまま返す", () => {
    expect(createExcerpt("短い本文です。")).toBe("短い本文です。");
  });

  it("上限の後半に句点があれば、その文で切る", () => {
    const text = `${"あ".repeat(70)}。${"い".repeat(100)}`;
    expect(createExcerpt(text, 120)).toBe(`${"あ".repeat(70)}。`);
  });

  it("句点がなければ上限で切って省略記号を付ける", () => {
    expect(createExcerpt("あ".repeat(200), 10)).toBe(`${"あ".repeat(10)}…`);
  });
});
