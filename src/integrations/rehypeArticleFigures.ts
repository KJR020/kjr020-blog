type HastProperties = Record<string, unknown>;

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: HastProperties;
  children?: HastNode[];
};

function isWhitespace(node: HastNode): boolean {
  return node.type === "text" && (node.value?.trim() ?? "") === "";
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * 画像だけ、または画像と強調（`*キャプション*`）だけの段落をfigureへ変換する。
 * ほかの内容を含む段落は対象外としてnullを返す。
 */
function createFigure(paragraph: HastNode): HastNode | null {
  const children = paragraph.children?.filter((child) => !isWhitespace(child)) ?? [];
  const [image, caption] = children;

  if (paragraph.tagName !== "p" || image?.tagName !== "img") return null;
  if (children.length > 2 || (caption && caption.tagName !== "em")) return null;

  const src = asText(image.properties?.src);
  if (!src) return null;

  const alt = asText(image.properties?.alt);
  const figureChildren: HastNode[] = [
    {
      type: "element",
      tagName: "a",
      properties: {
        href: src,
        className: ["article-image-trigger"],
        ariaLabel: `画像を拡大: ${alt || "記事内の画像"}`,
        "data-article-image-trigger": "",
      },
      children: [image],
    },
  ];

  if (caption) {
    figureChildren.push({
      type: "element",
      tagName: "figcaption",
      properties: {},
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: caption.children ?? [],
        },
      ],
    });
  }

  return {
    type: "element",
    tagName: "figure",
    properties: { className: ["article-figure"] },
    children: figureChildren,
  };
}

function transformChildren(node: HastNode): void {
  if (!node.children) return;

  node.children = node.children.map((child) => {
    const figure = createFigure(child);
    if (figure) return figure;

    transformChildren(child);
    return child;
  });
}

/**
 * 記事内の画像を、拡大表示のリンクとキャプションを持つfigureへ変換するrehypeプラグイン。
 *
 * Markdownでは画像の直後に強調を書くだけでキャプションを付けられるようにする。
 */
export function rehypeArticleFigures() {
  return (tree: HastNode): void => {
    transformChildren(tree);
  };
}
