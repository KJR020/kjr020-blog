import { describe, expect, it } from "vitest";
import { createPublishedPostStaticPaths } from "./postRoutes";

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
