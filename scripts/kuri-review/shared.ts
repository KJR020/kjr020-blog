/**
 * くりの動きをレビューするスクリプトの共通処理。
 * 起動済みのdev serverを撮影し、画像と数値を出力する。
 *
 * ページ内で実行する関数（evaluateやaddInitScriptへ渡すもの）の中では、関数に名前を付けない。
 * tsxは名前付きの関数へ補助関数の呼び出しを差し込み、それがページ側では未定義になる。
 */
import { mkdirSync } from "node:fs";
import { parseArgs } from "node:util";

import type { Browser, Locator, Page } from "playwright";
import sharp from "sharp";

/** 撮影するテーマ。くりはライトで塗り、ダークで線画になる */
export type Theme = "light" | "dark";
export const THEMES: Theme[] = ["light", "dark"];

/** コマ送りの間隔。60fpsの1フレーム */
export const FRAME_MS = 1000 / 60;

declare global {
  interface Window {
    /** 撮影のために止めたアニメーション。時刻を指定してコマ送りする */
    __kuriReview: Animation[];
  }
}

/** コマンドライン引数から決まる、出力先・撮影先・テーマ */
export interface ReviewOptions {
  outDir: string;
  baseUrl: string;
  theme: Theme;
}

export function readOptions(): ReviewOptions {
  const { values } = parseArgs({
    options: {
      out: { type: "string", default: "test-results/kuri-review" },
      "base-url": { type: "string", default: "http://localhost:4321" },
      theme: { type: "string", default: "light" },
    },
  });
  if (values.theme !== "light" && values.theme !== "dark") {
    throw new Error(`--theme には light か dark を指定する: ${values.theme}`);
  }
  mkdirSync(values.out, { recursive: true });
  return { outDir: values.out, baseUrl: values["base-url"], theme: values.theme };
}

/** 撮影用にページを開くときの設定 */
interface PageOptions {
  deviceScaleFactor?: number;
  /** 撮影のために追加するCSS */
  css?: string;
  /** Math.randomを固定値にし、乱数で分かれるアクションを再現できるようにする */
  random?: number;
}

/** テーマを指定してページを開く。dev toolbarは写り込むので隠す */
export async function openPage(
  browser: Browser,
  url: string,
  theme: Theme,
  options: PageOptions = {},
): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: options.deviceScaleFactor ?? 2,
  });
  await page.addInitScript(
    ({ theme, random }) => {
      localStorage.setItem("theme", theme);
      if (random !== undefined) Math.random = () => random;
    },
    { theme, random: options.random },
  );
  await page.goto(url, { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: `astro-dev-toolbar{display:none!important}${options.css ?? ""}`,
  });
  return page;
}

/** 登場などの動きを終わらせ、呼吸を止め、視線を正面へ戻す。撮影の基準になる姿勢にする */
export async function rest(kuri: Locator): Promise<void> {
  await kuri.evaluate((svg) => {
    for (const animation of svg.getAnimations({ subtree: true })) {
      if (animation instanceof CSSAnimation) {
        animation.pause();
        animation.currentTime = 0;
      } else {
        animation.finish();
      }
    }
    svg.style.setProperty("--gaze-x", "0px");
    svg.style.setProperty("--gaze-y", "0px");
  });
}

/** 要素のまわりに余白を取った撮影範囲 */
export async function clipAround(
  target: Locator,
  margin: { x: number; top: number; bottom: number },
) {
  const box = await target.boundingBox();
  if (!box) throw new Error("撮影する要素が表示されていない");
  return {
    x: Math.max(0, box.x - margin.x),
    y: Math.max(0, box.y - margin.top),
    width: box.width + margin.x * 2,
    height: box.height + margin.top + margin.bottom,
  };
}

/** 1枚の撮影画像と、並べたときに下へ書くラベル */
export interface Shot {
  buffer: Buffer;
  label?: string;
}

/** 画像を格子状に並べて1枚にする。ラベルがあれば各画像の下に書く */
export async function contactSheet(
  file: string,
  shots: Shot[],
  options: { columns: number; height?: number },
): Promise<void> {
  const meta = await sharp(shots[0].buffer).metadata();
  const height = options.height ?? meta.height;
  const width = Math.round((meta.width * height) / meta.height);
  const labelHeight = shots.some((shot) => shot.label) ? 18 : 0;
  const columns = Math.min(shots.length, options.columns);
  const rows = Math.ceil(shots.length / columns);
  const composites: sharp.OverlayOptions[] = [];
  for (const [index, shot] of shots.entries()) {
    const left = (index % columns) * width;
    const top = Math.floor(index / columns) * (height + labelHeight);
    composites.push({
      input: await sharp(shot.buffer).resize(width, height, { fit: "fill" }).toBuffer(),
      left,
      top,
    });
    if (shot.label) {
      composites.push({
        input: Buffer.from(
          `<svg width="${width}" height="${labelHeight}"><text x="4" y="13" font-size="11" font-family="monospace" fill="#555">${shot.label}</text></svg>`,
        ),
        left,
        top: top + height,
      });
    }
  }
  await sharp({
    create: {
      width: columns * width,
      height: rows * (height + labelHeight),
      channels: 4,
      background: "#fff",
    },
  })
    .composite(composites)
    .png()
    .toFile(file);
}

/** 折れ線グラフの1系列。時刻ごとの値と描画色 */
export interface Series {
  label: string;
  color: string;
  values: number[];
  /** 縦軸の範囲。系列ごとに単位が違うため、それぞれに持たせる */
  range: [number, number];
}

/** 時刻ごとの値を折れ線で描く。点は1サンプルを表し、間隔から速度の変化を読む */
export async function lineChart(
  file: string,
  times: number[],
  series: Series[],
  title: string,
): Promise<void> {
  const width = 760;
  const height = 320;
  const pad = 40;
  const end = times.at(-1) || 1;
  const x = (time: number) => pad + (time / end) * (width - pad * 2);
  const lines = series
    .map(({ values, color, range: [min, max] }) => {
      const y = (value: number) =>
        height - pad - ((value - min) / (max - min)) * (height - pad * 2);
      const points = values.map((value, index) => [
        x(times[index]).toFixed(1),
        y(value).toFixed(1),
      ]);
      const d = points.map(([px, py], index) => `${index ? "L" : "M"}${px} ${py}`).join("");
      const dots = points
        .map(([px, py]) => `<circle cx="${px}" cy="${py}" r="1.5" fill="${color}"/>`)
        .join("");
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5"/>${dots}`;
    })
    .join("");
  const legend = series
    .map(
      ({ label, color }, index) =>
        `<text x="${pad + index * 116}" y="20" font-size="12" fill="${color}" font-family="sans-serif">${label}</text>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff"/>
    <text x="${width - pad}" y="38" font-size="12" text-anchor="end" font-family="sans-serif">${title}（${Math.round(end)}ms、点=1/60s）</text>
    ${legend}<line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#999"/>${lines}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}
