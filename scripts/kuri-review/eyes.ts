#!/usr/bin/env tsx

/**
 * くりの目の状態（開いた目、まばたきで閉じた瞬間、眠っている目）を、ライトとダークで並べる。
 *
 * 使い方: dev serverを起動してから
 *   pnpm exec tsx scripts/kuri-review/eyes.ts [--out <dir>] [--base-url <url>]
 */
import path from "node:path";

import { chromium } from "playwright";

import { clipAround, contactSheet, openPage, readOptions, rest, type Shot, THEMES } from "./shared";

const STATES = [
  { label: "open", closed: false, css: "" },
  {
    // まぶたを下ろしきった位置で止める
    label: "blink",
    closed: false,
    css: ".kuri__eyelid{opacity:1!important;transform:translateY(55px)!important}.kuri__pupils{transform:translateY(-10px)!important}",
  },
  {
    label: "asleep",
    closed: true,
    css: ".kuri__lid-line,.kuri__sleep-line{transition:none!important}",
  },
];

const { outDir, baseUrl } = readOptions();
const browser = await chromium.launch();
const shots: Shot[] = [];
for (const theme of THEMES) {
  for (const state of STATES) {
    const page = await openPage(browser, `${baseUrl}/__test/home`, theme, {
      deviceScaleFactor: 3,
      css: state.css,
    });
    const kuri = page.locator(".home-hero [data-kuri]");
    await kuri.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await rest(kuri);
    await kuri.evaluate((svg, closed) => svg.classList.toggle("is-closed", closed), state.closed);
    await page.waitForTimeout(100);
    shots.push({
      buffer: await page.screenshot({
        clip: await clipAround(kuri, { x: 10, top: 10, bottom: 4 }),
      }),
      label: `${state.label} (${theme})`,
    });
    await page.close();
  }
}

const file = path.join(outDir, "eyes.png");
await contactSheet(file, shots, { columns: STATES.length, height: 300 });
console.log(file);
await browser.close();
