#!/usr/bin/env tsx

/**
 * くりの登場・ジャンプ・まばたきをレビューする成果物を作る。
 * レビューの順（等速の印象 → キーポーズ → シルエット → オニオンスキン → カーブ）に対応する画像と、
 * 数値で判定できる関門（接地、体積、着地の加速、離陸の速度比、まばたき）を出力する。
 *
 * 使い方: dev serverを起動してから
 *   pnpm exec tsx scripts/kuri-review/motion.ts [--out <dir>] [--base-url <url>]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { type Browser, chromium, type Locator } from "playwright";
import sharp from "sharp";

import {
  clipAround,
  contactSheet,
  FRAME_MS,
  lineChart,
  openPage,
  readOptions,
  rest,
  type Shot,
  THEMES,
  type Theme,
} from "./shared";

const VIEWBOX_WIDTH = 437;

interface Scenario {
  name: string;
  event: string;
  /** キーポーズの時刻（総時間に対する割合） */
  keyPoses: Record<string, number>;
  /** 足が地面に着いているはずの区間（総時間に対する割合） */
  grounded?: [number, number][];
  takeoff?: number;
  impact?: number;
  /** まばたきは短いので、全フレームを並べる */
  everyFrame?: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    name: "enter",
    event: "kuri:enter",
    keyPoses: { start: 0, emerge: 0.3, overshoot: 0.68, land: 0.86, settle: 1 },
    grounded: [[0.86, 1]],
  },
  {
    name: "jump",
    event: "kuri:jump",
    keyPoses: {
      idle: 0,
      anticipation: 0.12,
      takeoff: 0.24,
      apex: 0.5,
      fall: 0.7,
      impact: 0.79,
      rebound: 0.89,
      settle: 1,
    },
    grounded: [
      [0, 0.12],
      [0.79, 0.8],
      [0.99, 1],
    ],
    takeoff: 0.24,
    impact: 0.79,
  },
  {
    name: "blink",
    event: "kuri:blink",
    keyPoses: { open: 0, third: 0.14, shut: 0.33, opening: 0.55, open2: 1 },
    everyFrame: true,
  },
];

/** 体と目を分けて見るための追加CSS */
const PASSES = {
  normal: "",
  // 体の動きだけを見る（目を隠す）
  body: ".kuri__gaze{visibility:hidden!important}",
  // 目の演技だけを見る（体を薄くする）
  eyes: ".kuri__whole .kuri__ink{fill:#d4d4d4!important;stroke:#d4d4d4!important}",
};

interface Frame {
  t: number;
  buffer: Buffer;
  /** 体の縦位置と伸縮（viewBox単位、倍率） */
  ty: number;
  sx: number;
  sy: number;
  eyeY: number;
  /** まぶたの下り具合。0で開き、1で閉じる */
  drop: number;
}

interface Capture {
  frames: Frame[];
  poses: Shot[];
  duration: number;
  cssPxPerUnit: number;
}

/** 演技を開始してすぐ止め、総時間を返す。まばたきは他の動きの最中だと始まらないので、数回試す */
async function start(kuri: Locator, eventName: string): Promise<number> {
  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt) await kuri.page().waitForTimeout(300);
    const duration = await kuri.evaluate((svg, name) => {
      const before = new Set(svg.getAnimations({ subtree: true }));
      svg.dispatchEvent(new Event(name));
      const started = svg.getAnimations({ subtree: true }).filter((a) => !before.has(a));
      window.__kuriReview = started;
      for (const animation of started) animation.pause();
      return Math.max(0, ...started.map((a) => Number(a.effect?.getComputedTiming().endTime)));
    }, eventName);
    if (duration) return duration;
  }
  throw new Error(`${eventName}: アニメーションが開始されなかった`);
}

const seek = (kuri: Locator, time: number) =>
  kuri.evaluate((svg, t) => {
    for (const animation of window.__kuriReview) animation.currentTime = t;
    const [action, follow, lid] = [".kuri__action", ".kuri__follow", ".kuri__eyelid"].map(
      (selector) =>
        new DOMMatrixReadOnly(getComputedStyle(svg.querySelector(selector) as Element).transform),
    );
    const eyelid = svg.querySelector(".kuri__eyelid") as SVGElement;
    return {
      ty: action.f,
      sx: action.a,
      sy: action.d,
      eyeY: follow.f,
      drop: lid.f / Number(eyelid.dataset.drop),
    };
  }, time);

async function capture(
  browser: Browser,
  baseUrl: string,
  theme: Theme,
  scenario: Scenario,
  pass: keyof typeof PASSES,
): Promise<Capture> {
  const page = await openPage(browser, `${baseUrl}/__test/home`, theme, { css: PASSES[pass] });
  const kuri = page.locator(".home-hero [data-kuri]");
  await kuri.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await rest(kuri);
  await page.waitForTimeout(150);

  const duration = await start(kuri, scenario.event);
  const box = await kuri.boundingBox();
  if (!box) throw new Error("くりが表示されていない");
  // ジャンプの頂点まで収める
  const clip = await clipAround(kuri, {
    x: box.width * 0.25,
    top: box.height * 0.45,
    bottom: box.height * 0.1,
  });
  const frames: Frame[] = [];
  for (let t = 0; t <= duration + 0.1; t += FRAME_MS) {
    const time = Math.min(t, duration);
    const sample = await seek(kuri, time);
    frames.push({ t: time, ...sample, buffer: await page.screenshot({ clip }) });
  }
  const poses: Shot[] = [];
  for (const [label, ratio] of Object.entries(scenario.keyPoses)) {
    await seek(kuri, duration * ratio);
    poses.push({
      buffer: await page.screenshot({ clip }),
      label: `${label} ${Math.round(duration * ratio)}ms`,
    });
  }
  await page.close();
  return { frames, poses, duration, cssPxPerUnit: box.width / VIEWBOX_WIDTH };
}

/** 前後2フレームを薄く重ねる。重ねた形の間隔で、速度と軌道の乱れを見る */
async function onionSkin(file: string, frames: Frame[], center: number): Promise<void> {
  const indices = [-2, -1, 0, 1, 2]
    .map((offset) => center + offset)
    .filter((index) => index >= 0 && index < frames.length);
  const base = await sharp(frames[center].buffer).metadata();
  const layers: sharp.OverlayOptions[] = [];
  for (const index of indices) {
    const distance = Math.abs(index - center);
    const strength = distance === 0 ? 1 : distance === 1 ? 0.35 : 0.18;
    layers.push({
      input: await sharp(frames[index].buffer)
        .removeAlpha()
        .linear(strength, 255 * (1 - strength))
        .toBuffer(),
      blend: "multiply",
    });
  }
  await sharp({
    create: { width: base.width, height: base.height, channels: 3, background: "#fff" },
  })
    .composite(layers)
    .png()
    .toFile(file);
}

/** 実時間で再生するGIF。遅延は1/100秒単位なので、20msごとに間引く */
async function realtimeGif(file: string, frames: Frame[]): Promise<void> {
  const end = frames.at(-1)?.t ?? 0;
  const picked: Frame[] = [];
  for (let t = 0; t <= end; t += 20) {
    picked.push(frames.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)));
  }
  // 最後の姿勢でしばらく止め、繰り返しの切れ目を分かるようにする
  const all = [...picked, ...Array.from({ length: 25 }, () => picked[picked.length - 1])];
  const resized = await Promise.all(
    all.map((frame) => sharp(frame.buffer).resize({ height: 220 }).png().toBuffer()),
  );
  await sharp(resized, { join: { animated: true } })
    .gif({ delay: all.map(() => 20), loop: 0 })
    .toFile(file);
}

const velocityY = (frames: Frame[]) =>
  frames.map((frame, index) => (index ? (frame.ty - frames[index - 1].ty) / (FRAME_MS / 1000) : 0));

/** 数値で判定できる関門 */
function gates(scenario: Scenario, { frames, duration, cssPxPerUnit }: Capture) {
  const result: Record<string, object> = {};
  const indexAt = (ratio: number) => frames.findIndex((frame) => frame.t >= duration * ratio - 0.1);

  const { grounded } = scenario;
  if (grounded) {
    const errors = frames
      .filter(({ t }) =>
        grounded.some(([a, b]) => t >= duration * a - 0.1 && t <= duration * b + 0.1),
      )
      .map((frame) => Math.abs(frame.ty) * cssPxPerUnit);
    const worst = Math.max(0, ...errors);
    result.contact = { worstCssPx: +worst.toFixed(2), pass: worst <= 0.5 };
  }

  const volumes = frames.map((frame) => frame.sx * frame.sy);
  const [min, max] = [Math.min(...volumes), Math.max(...volumes)];
  result.volume = { min: +min.toFixed(3), max: +max.toFixed(3), pass: min >= 0.94 && max <= 1.06 };

  if (scenario.impact !== undefined && scenario.takeoff !== undefined) {
    const velocity = velocityY(frames);
    // 着地の直前は、下向き（正）の速度が増え続けていること
    const impact = indexAt(scenario.impact);
    const before = velocity.slice(impact - 4, impact);
    result.landing = {
      velocities: before.map(Math.round),
      pass: before.every((value, index) => index === 0 || value >= before[index - 1] - 1),
    };
    // 離陸の前後で、速度が急に跳ね上がらないこと
    const takeoff = indexAt(scenario.takeoff);
    const [vBefore, vAfter] = [Math.abs(velocity[takeoff]), Math.abs(velocity[takeoff + 1])];
    const ratio = vAfter / Math.max(1, vBefore);
    result.takeoff = {
      before: Math.round(vBefore),
      after: Math.round(vAfter),
      ratio: +ratio.toFixed(2),
      pass: ratio <= 1.6,
    };
  }

  if (scenario.name === "blink") {
    // 閉じる途中が2フレーム以上見え、閉じきった状態は1〜2フレームに収まること
    const firstShut = frames.findIndex((frame) => frame.drop >= 0.99);
    const closing = frames.slice(0, firstShut).filter((frame) => frame.drop > 0.05).length;
    const shut = frames.filter((frame) => frame.drop >= 0.99).length;
    result.blink = {
      closingFrames: closing,
      shutFrames: shut,
      pass: closing >= 2 && shut >= 1 && shut <= 2,
    };
  }
  return result;
}

const { outDir, baseUrl } = readOptions();
const browser = await chromium.launch();
const report: Record<string, object> = {};
for (const scenario of SCENARIOS) {
  const file = (name: string) => path.join(outDir, `${scenario.name}-${name}`);
  for (const theme of THEMES) {
    const result = await capture(browser, baseUrl, theme, scenario, "normal");
    const strip = result.frames
      .filter((_, index) => scenario.everyFrame || index % 2 === 0)
      .map((frame) => ({ buffer: frame.buffer, label: `${Math.round(frame.t)}ms` }));
    await contactSheet(file(`${theme}-filmstrip.png`), strip, { columns: 12, height: 140 });
    await contactSheet(file(`${theme}-poses.png`), result.poses, { columns: 12, height: 200 });
    // 動きの形はテーマで変わらないので、カーブと関門はライトだけで見る
    if (theme !== "light") continue;
    const { frames, duration } = result;
    await lineChart(
      file("curves.png"),
      frames.map((frame) => frame.t),
      [
        {
          label: "translateY",
          color: "#2563eb",
          values: frames.map((f) => f.ty),
          range: [-140, 20],
        },
        { label: "velocityY", color: "#7c3aed", values: velocityY(frames), range: [-1500, 1500] },
        { label: "scaleX", color: "#dc2626", values: frames.map((f) => f.sx), range: [0.9, 1.1] },
        { label: "scaleY", color: "#16a34a", values: frames.map((f) => f.sy), range: [0.9, 1.1] },
        { label: "eyeY", color: "#ea580c", values: frames.map((f) => f.eyeY), range: [-15, 15] },
      ],
      scenario.name,
    );
    await realtimeGif(file("1x.gif"), frames);
    const focus = frames.findIndex(
      (frame) => frame.t >= duration * (scenario.impact ?? 0.33) - 0.1,
    );
    await onionSkin(file("onion.png"), frames, focus);
    report[scenario.name] = { duration, gates: gates(scenario, result) };
  }
  for (const pass of ["body", "eyes"] as const) {
    const result = await capture(browser, baseUrl, "light", scenario, pass);
    await contactSheet(file(`${pass}-poses.png`), result.poses, { columns: 12, height: 200 });
  }
}
writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
