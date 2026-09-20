/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagBubbleCloud } from "@/components/TagBubbleCloud";

const mockTags = [
  { name: "astro", count: 5 },
  { name: "react", count: 3 },
  { name: "typescript", count: 1 },
];

describe("TagBubbleCloud", () => {
  it("すべてのタグがボタンとしてレンダリングされる", () => {
    render(<TagBubbleCloud tags={mockTags} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("タグ名と件数が表示される", () => {
    render(<TagBubbleCloud tags={mockTags} />);
    expect(screen.getByText("astro")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("空のタグ配列で何もレンダリングされない", () => {
    render(<TagBubbleCloud tags={[]} />);
    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);
  });

  it("タグが1つだけの場合でも正しくレンダリングされる", () => {
    render(<TagBubbleCloud tags={[{ name: "solo", count: 1 }]} />);
    expect(screen.getByText("solo")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("aria-labelがタグクラウドコンテナに設定される", () => {
    render(<TagBubbleCloud tags={mockTags} />);
    expect(screen.getByLabelText("タグクラウド")).toBeInTheDocument();
  });
});
