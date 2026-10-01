import { describe, expect, it } from "vitest";
import { assertPostsRendered, createPublishedPostStaticPaths } from "@/lib/postRoutes";

describe("createPublishedPostStaticPaths", () => {
  it("draft posts are excluded from generated static paths", () => {
    const posts = [
      { id: "published/post", data: { draft: false, title: "Published" } },
      { id: "draft/post", data: { draft: true, title: "Draft" } },
      { id: "default/post", data: { title: "Default published" } },
    ];

    expect(createPublishedPostStaticPaths(posts)).toEqual([
      {
        params: { slug: "published/post" },
        props: { post: posts[0] },
      },
      {
        params: { slug: "default/post" },
        props: { post: posts[2] },
      },
    ]);
  });

  it("指定したdraftだけをfixtureとして生成できる", () => {
    const posts = [
      { id: "__test/article", data: { draft: true, title: "Test article" } },
      { id: "draft/post", data: { draft: true, title: "Draft" } },
    ];

    expect(createPublishedPostStaticPaths(posts, ["__test/article"])).toEqual([
      {
        params: { slug: "__test/article" },
        props: { post: posts[0] },
      },
    ]);
  });
});

describe("assertPostsRendered", () => {
  it("すべての記事が変換済みなら何もしない", () => {
    const posts = [
      { id: "a/post", rendered: { html: "<p>A</p>" } },
      { id: "b/post", rendered: { html: "" } },
    ];

    expect(() => assertPostsRendered(posts)).not.toThrow();
  });

  it("変換に失敗した記事があれば、そのIDを示してビルドを止める", () => {
    const posts = [
      { id: "ok/post", rendered: { html: "<p>OK</p>" } },
      { id: "broken/first", rendered: undefined },
      { id: "broken/second" },
    ];

    expect(() => assertPostsRendered(posts)).toThrow(
      "Markdownの変換に失敗した記事があります: broken/first, broken/second",
    );
  });
});
