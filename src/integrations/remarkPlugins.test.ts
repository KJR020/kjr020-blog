// @ts-expect-error remark-link-card does not publish type declarations.
import remarkLinkCard from "remark-link-card";
import { describe, expect, it } from "vitest";

import * as astroConfigModule from "../../astro.config.mjs";

type CreateRemarkPlugins = (options: { linkCardFetchMode: "live" | "offline" }) => unknown[];

const createRemarkPlugins = (astroConfigModule as { createRemarkPlugins?: CreateRemarkPlugins })
  .createRemarkPlugins;

function getPlugin(pluginEntry: unknown): unknown {
  return Array.isArray(pluginEntry) ? pluginEntry[0] : pluginEntry;
}

describe("createRemarkPlugins", () => {
  it("omits the network-bound link card plugin in offline mode", () => {
    expect(createRemarkPlugins).toBeTypeOf("function");

    const plugins = createRemarkPlugins?.({ linkCardFetchMode: "offline" }) ?? [];

    expect(plugins.map(getPlugin)).not.toContain(remarkLinkCard);
  });

  it("includes the link card plugin in live mode", () => {
    expect(createRemarkPlugins).toBeTypeOf("function");

    const plugins = createRemarkPlugins?.({ linkCardFetchMode: "live" }) ?? [];

    expect(plugins.map(getPlugin)).toContain(remarkLinkCard);
  });
});
