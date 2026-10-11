import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { type Browser, chromium, type Page } from "playwright";

const full = process.argv.includes("--full");
const directory = await mkdtemp(path.join(tmpdir(), "cosense-cache-"));
const started = performance.now();
const expectedCacheControl = "public, max-age=300, s-maxage=600";
let generation = 1;
let upstreamCalls = 0;
let upstreamStatus = 200;

await build({
  entryPoints: ["tests/worker/fixtures/cache-lifetime.ts"],
  outfile: path.join(directory, "worker.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
});
await build({
  entryPoints: ["tests/src/components/scrapbox/fixtures/cache-lifetime.tsx"],
  outfile: path.join(directory, "browser.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browserScript = await readFile(path.join(directory, "browser.js"), "utf8");
const mf = new Miniflare({
  modules: true,
  modulesRoot: directory,
  scriptPath: path.join(directory, "worker.js"),
  compatibilityDate: "2025-03-01",
  cf: false,
  port: 0,
  bindings: { SCRAPBOX_SID: "fixture-only-not-a-real-secret" },
  serviceBindings: {
    ASSETS: async (request) => {
      if (new URL(request.url).pathname === "/browser.js") {
        return new Response(browserScript, { headers: { "Content-Type": "text/javascript" } });
      }
      const script =
        new URL(request.url).pathname === "/"
          ? '<script type="module" src="/browser.js"></script>'
          : "";
      return new Response(
        `<!doctype html><html><body><div id="root"></div>${script}</body></html>`,
        {
          headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
        },
      );
    },
  },
  outboundService: async (request) => {
    assert.equal(request.url, "https://scrapbox.io/api/pages/KJR020?limit=100");
    upstreamCalls++;
    return Response.json(
      {
        pages: [
          {
            id: "fixture",
            title: `generation-${generation}`,
            image: null,
            descriptions: [],
            updated: 1_700_000_000,
          },
        ],
      },
      { status: upstreamStatus },
    );
  },
});
let browser: Browser | undefined;

try {
  browser = await chromium.launch({ channel: "chromium" });
  const origin = (await mf.ready).origin;
  const api = `${origin}/api/pages/KJR020?limit=100`;
  const seed = async (age: number) => {
    const response = await fetch(`${origin}/__test/seed?age=${age}`, { method: "POST" });
    assert.equal(response.status, 204);
  };
  const requests = async () => {
    const response = await fetch(`${origin}/__test/requests`);
    const body: unknown = await response.json();
    assert(body !== null && typeof body === "object" && "requests" in body);
    assert(typeof body.requests === "number");
    return body.requests;
  };
  const observe = async (phase: string) => {
    const response = await fetch(api);
    const body: unknown = await response.json();
    let returnedGeneration: string | null = null;
    if (response.ok) {
      assert(Array.isArray(body));
      const first: unknown = body[0];
      assert(first !== null && typeof first === "object" && "title" in first);
      assert(typeof first.title === "string");
      returnedGeneration = first.title;
    }
    const row = {
      phase,
      elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(2)),
      status: response.status,
      generation: returnedGeneration,
      upstreamCalls,
      cacheControl: response.headers.get("Cache-Control"),
      age: response.headers.get("Age"),
      date: response.headers.get("Date"),
    };
    console.log(JSON.stringify(row));
    return row;
  };
  const remount = async (page: Page) => {
    await page.getByRole("button", { name: "unmount", exact: true }).click();
    await page.getByRole("button", { name: "mount", exact: true }).click();
    await page.locator('output[data-fetching="false"]').waitFor();
  };

  const miss = await observe("initial MISS");
  assert.equal(miss.generation, "generation-1");
  assert.equal(miss.cacheControl, expectedCacheControl);
  const hit = await observe("initial HIT");
  assert.equal(hit.generation, "generation-1");
  assert.equal(upstreamCalls, 1);

  generation = 2;
  await seed(599);
  const callsBeforeExpiry = upstreamCalls;
  assert.equal((await observe("Age=599 HIT")).generation, "generation-2");
  generation = 3;
  await delay(2_100);
  assert.equal((await observe("Age=599 expired MISS")).generation, "generation-3");
  assert.equal(upstreamCalls, callsBeforeExpiry + 1);

  await seed(599);
  upstreamStatus = 503;
  await delay(2_100);
  const failure = await observe("expired upstream failure");
  assert.equal(failure.status, 502);
  assert.equal(failure.cacheControl, "no-store");
  upstreamStatus = 200;
  generation = 4;
  assert.equal((await observe("upstream recovery MISS")).generation, "generation-4");

  await seed(299);
  const httpPage = await browser.newPage();
  await httpPage.goto(`${origin}/__test/http`);
  const browserFetch = () =>
    httpPage.evaluate(async () => (await fetch("/api/pages/KJR020?limit=100")).json());
  await browserFetch();
  const httpRequests = await requests();
  await browserFetch();
  assert.equal(
    await requests(),
    httpRequests,
    "An immediate browser fetch should reuse HTTP cache",
  );
  await delay(2_100);
  await browserFetch();
  assert.equal(await requests(), httpRequests + 1, "Age must shorten browser freshness");
  console.log(
    JSON.stringify({
      phase: "browser HTTP cache",
      initialRequests: httpRequests,
      expiredRequests: await requests(),
      upstreamCalls,
    }),
  );
  await httpPage.close();

  await seed(299);
  const queryPage = await browser.newPage();
  await queryPage.clock.install();
  await queryPage.goto(origin);
  await queryPage.locator('output[data-fetching="false"]').waitFor();
  const queryRequests = await requests();
  await delay(2_100);
  await remount(queryPage);
  assert.equal(
    await requests(),
    queryRequests,
    "React Query should reuse fresh data after HTTP freshness expires",
  );
  await queryPage.clock.fastForward(300_001);
  assert.equal(await requests(), queryRequests, "staleTime must not trigger periodic fetching");
  await remount(queryPage);
  assert.equal(await requests(), queryRequests + 1, "Remounting a stale query should fetch again");
  console.log(
    JSON.stringify({
      phase: "React Query cache",
      freshRequests: queryRequests,
      staleRemountRequests: await requests(),
      upstreamCalls,
    }),
  );
  await queryPage.close();

  if (full) {
    await seed(0);
    const savedAt = performance.now();
    const callsAtSave = upstreamCalls;
    const page = await browser.newPage();
    await page.goto(origin);
    await page.locator('output[data-fetching="false"]').waitFor();
    generation = 5;
    await observe("full: saved");
    console.log(
      "Full verification waits until 310s and 612s after saving; the production TTL is unchanged.",
    );
    await delay(Math.max(0, 310_000 - (performance.now() - savedAt)));
    await remount(page);
    assert.equal(await page.locator("output").textContent(), "generation-4");
    assert.equal(upstreamCalls, callsAtSave);
    await observe("full: 310s shared HIT");
    await delay(Math.max(0, 612_000 - (performance.now() - savedAt)));
    assert.equal(
      await page.locator("output").textContent(),
      "generation-4",
      "An open page must not periodically update",
    );
    await remount(page);
    assert.equal(await page.locator("output").textContent(), "generation-5");
    assert.equal(upstreamCalls, callsAtSave + 1);
    await observe("full: 612s shared expired and query remounted");
    await page.close();
  }
  console.log(
    "PASS: Cache API expiration, browser HTTP freshness, and React Query refetch behavior",
  );
} finally {
  await browser?.close();
  await mf.dispose();
  await rm(directory, { recursive: true, force: true });
}
