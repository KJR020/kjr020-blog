import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  describe("単一クラス名の処理", () => {
    it("単一の文字列クラスを返す", () => {
      expect(cn("text-red-500")).toBe("text-red-500");
    });

    it("空文字列を渡すと空文字列を返す", () => {
      expect(cn("")).toBe("");
    });
  });

  describe("複数クラス名の結合", () => {
    it("複数のクラス名をスペースで結合する", () => {
      expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
    });

    it("3つ以上のクラス名を結合する", () => {
      expect(cn("p-4", "m-2", "rounded")).toBe("p-4 m-2 rounded");
    });
  });

  describe("条件付きクラス（truthy/falsy）の処理", () => {
    it("trueの場合はクラスを含める", () => {
      const isActive = true;
      expect(cn("base", isActive && "active")).toBe("base active");
    });

    it("falseの場合はクラスを除外する", () => {
      const isActive = false;
      expect(cn("base", isActive && "active")).toBe("base");
    });

    it("nullやundefinedは除外する", () => {
      expect(cn("base", null, undefined)).toBe("base");
    });
  });

  describe("Tailwindクラスの競合解決（twMerge動作）", () => {
    it("同じプロパティのクラスは後者が優先される", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("paddingの競合を解決する", () => {
      expect(cn("p-4", "p-2")).toBe("p-2");
    });

    it("marginの競合を解決する", () => {
      expect(cn("mt-4", "mt-8")).toBe("mt-8");
    });

    it("異なるプロパティは両方保持する", () => {
      expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
    });
  });

  describe("φスペーシングトークンの競合解決", () => {
    // globals.cssの--spacing-phi-*。未登録だと両方残り、CSSの出現順で勝敗が決まる
    it.each([
      ["gap", "gap-phi-xl", "gap-phi-2xs"],
      ["padding-block", "py-phi-xl", "py-phi-xs"],
      ["padding-inline", "px-phi-xl", "px-phi-md"],
      ["margin-top", "mt-phi-3xs", "mt-phi-3xl"],
    ])("%sは後者のφトークンが優先される", (_property, base, override) => {
      expect(cn(base, override)).toBe(override);
    });

    it("φトークンと既定スケールの競合も解決する", () => {
      expect(cn("py-phi-xl", "py-0")).toBe("py-0");
    });

    it("軸の異なるφトークンは両方保持する", () => {
      expect(cn("px-phi-xl", "py-phi-xs")).toBe("px-phi-xl py-phi-xs");
    });
  });

  describe("エッジケース", () => {
    it("引数なしで呼び出すと空文字列を返す", () => {
      expect(cn()).toBe("");
    });

    it("オブジェクト形式のクラスを処理する", () => {
      expect(cn({ "text-red-500": true, "bg-blue-500": false })).toBe("text-red-500");
    });

    it("配列形式のクラスを処理する", () => {
      expect(cn(["text-red-500", "bg-blue-500"])).toBe("text-red-500 bg-blue-500");
    });

    it("ネストされた配列を処理する", () => {
      expect(cn(["text-red-500", ["bg-blue-500", "p-4"]])).toBe("text-red-500 bg-blue-500 p-4");
    });

    it("混在した入力形式を処理する", () => {
      expect(cn("base", ["array-class"], { "object-class": true })).toBe(
        "base array-class object-class",
      );
    });
  });
});
