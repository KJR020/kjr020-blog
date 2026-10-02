#!/usr/bin/env tsx

/**
 * くりの登場・ジャンプ・まばたきをレビューする成果物を作る。
 * レビューの順（等速の印象 → キーポーズ → シルエット → オニオンスキン → カーブ）に対応する画像と、
 * 数値で判定できる関門（接地、体積、着地の加速、離陸の速度比、まばたき）を出力する。
 *
 * 構成
 * - SCENARIOS: 何をレビューするか
 * - reviewScenario: どの順でレビューするか
 * - captureScenario: どう撮るか
 * - write...: 何を成果物にするか
 * - evaluateGates: 何を合否判定するか
 *
 * 使い方: dev serverを起動してから
 *   pnpm exec tsx scripts/kuri-review/motion.ts [--out <dir>] [--base-url <url>]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { type Browser, chromium, type Locator, type Page } from "playwright";
import sharp from "sharp";

import {
  clipAround,
  contactSheet,
  FRAME_MS,
  lineChart,
  openPage,
  type ReviewOptions,
  readOptions,
  rest,
  type Shot,
  THEMES,
  type Theme,
} from "./shared";

// ---------------------------------------------------------------------------
// 何をレビューするか
// ---------------------------------------------------------------------------

/** 1つの演技について、撮り方と判定する関門を宣言する */
interface Scenario {
  /** 出力ファイル名の先頭に付ける名前 */
  name: string;
  /** 演技を始めるイベント。`Kuri.astro`が受け取る */
  event: string;
  /** 止めて見るポーズの名前と、その時刻（総時間に対する割合） */
  keyPoses: Record<string, number>;
  /** オニオンスキンの中心にするポーズ。動きが最も速い瞬間を選ぶ */
  onionPose: string;
  /** フィルムストリップに全コマを並べるか。省くと1コマおきに並べる */
  everyFrame?: boolean;
  /** この演技に掛ける関門 */
  gates: GateSpec[];
}

/** 関門の種類と、その演技に固有の設定 */
type GateSpec =
  /** 接地: 足が地面に着いているはずの区間（総時間に対する割合）で、体が上下にずれない */
  | { kind: "contact"; grounded: [number, number][] }
  /** 体積: 伸び縮みしても、見かけの面積が変わりすぎない */
  | { kind: "volume" }
  /** 着地: 指定したポーズの直前まで、落下が加速し続ける */
  | { kind: "landing"; impactPose: string }
  /** 離陸: 指定したポーズの前後で、速度が急に跳ね上がらない */
  | { kind: "takeoff"; takeoffPose: string }
  /** まばたき: 閉じる途中が見え、閉じきった状態が短い */
  | { kind: "blink" };

const SCENARIOS: Scenario[] = [
  {
    name: "enter",
    event: "kuri:enter",
    keyPoses: { start: 0, emerge: 0.3, overshoot: 0.68, land: 0.86, settle: 1 },
    onionPose: "emerge",
    gates: [{ kind: "contact", grounded: [[0.86, 1]] }, { kind: "volume" }],
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
    onionPose: "impact",
    gates: [
      {
        kind: "contact",
        grounded: [
          [0, 0.12],
          [0.79, 0.8],
          [0.99, 1],
        ],
      },
      { kind: "volume" },
      { kind: "landing", impactPose: "impact" },
      { kind: "takeoff", takeoffPose: "takeoff" },
    ],
  },
  {
    name: "blink",
    event: "kuri:blink",
    keyPoses: { open: 0, third: 0.14, shut: 0.33, opening: 0.55, open2: 1 },
    onionPose: "shut",
    everyFrame: true,
    gates: [{ kind: "volume" }, { kind: "blink" }],
  },
];

/** 関門の合格基準 */
const GATE_LIMITS = {
  /** 接地: 体の上下のずれ（CSS px） */
  contactCssPx: 0.5,
  /** 体積: 見かけの面積の倍率 */
  volume: { min: 0.94, max: 1.06 },
  /** 着地: 直前に見るコマ数と、速度が減ったとみなさない誤差（viewBox単位/秒） */
  landing: { frames: 4, tolerance: 1 },
  /** 離陸: 前後のコマの速度比 */
  takeoffVelocityRatio: 1.6,
  /** まばたき: まぶたの下り具合のしきい値と、閉じる途中・閉じきったコマ数 */
  blink: { open: 0.05, shut: 0.99, minClosingFrames: 2, minShutFrames: 1, maxShutFrames: 2 },
} as const;

/** 動きの形はテーマで変わらないので、カーブと関門はこのテーマだけで見る */
const REVIEW_THEME: Theme = "light";

/** 体と目を分けて見るための追加CSS。シルエットの確認に使う */
const PASSES = {
  normal: "",
  // 体の動きだけを見る（目を隠す）
  body: ".kuri__gaze{visibility:hidden!important}",
  // 目の演技だけを見る（体を薄くする）
  eyes: ".kuri__whole .kuri__ink{fill:#d4d4d4!important;stroke:#d4d4d4!important}",
};
type Pass = keyof typeof PASSES;

/** 割合から求めた時刻を比べるとき、浮動小数の丸めで境界のコマを落とさないための許容量（ms） */
const TIME_EPSILON_MS = 0.1;

// ---------------------------------------------------------------------------
// どの順でレビューするか
// ---------------------------------------------------------------------------

/** 1つの演技のレビュー結果。report.jsonへ書く */
interface ScenarioReport {
  duration: number;
  gates: Record<string, GateResult>;
}

/** シナリオ名を先頭に付けた出力パスを返す */
type ArtifactPath = (name: string) => string;

/** 1つの演技を撮り、レビューの順に成果物を書き出して、関門の結果を返す */
async function reviewScenario(
  browser: Browser,
  options: ReviewOptions,
  scenario: Scenario,
): Promise<ScenarioReport> {
  const artifact: ArtifactPath = (name) => path.join(options.outDir, `${scenario.name}-${name}`);

  const primary = await captureScenario(browser, options, scenario, REVIEW_THEME);
  await writeFilmstripAndPoses(artifact, scenario, REVIEW_THEME, primary);
  await writeMotionAnalysis(artifact, scenario, primary);

  for (const theme of THEMES.filter((theme) => theme !== REVIEW_THEME)) {
    const capture = await captureScenario(browser, options, scenario, theme);
    await writeFilmstripAndPoses(artifact, scenario, theme, capture);
  }

  for (const pass of ["body", "eyes"] as const) {
    const { poses } = await captureScenario(browser, options, scenario, REVIEW_THEME, pass);
    await contactSheet(artifact(`${pass}-poses.png`), poses, { columns: 12, height: 200 });
  }

  return { duration: primary.duration, gates: evaluateGates(scenario, primary) };
}

// ---------------------------------------------------------------------------
// どう撮るか
// ---------------------------------------------------------------------------

/** ある時刻に撮った画像と、同じ時刻のくりの姿勢 */
interface Frame {
  /** 演技の開始からの時刻（ms） */
  t: number;
  buffer: Buffer;
  /** 体の縦位置（viewBox単位、上が負） */
  ty: number;
  /** 体の横・縦の伸縮（倍率） */
  scaleX: number;
  scaleY: number;
  /** 見かけの面積の倍率。回転を含んでも正しく測れるよう、変換行列の行列式から求める */
  areaScale: number;
  /** 目の縦位置（viewBox単位） */
  eyeY: number;
  /** まぶたの下り具合。0で開き、1で閉じる */
  drop: number;
}

/** 1回の撮影で得たレビュー素材。全コマ、キーポーズ、総時間、単位の換算比 */
interface Capture {
  frames: Frame[];
  poses: Shot[];
  duration: number;
  cssPxPerUnit: number;
}

/** 1つの演技を、指定のテーマと見え方で撮る */
async function captureScenario(
  browser: Browser,
  options: ReviewOptions,
  scenario: Scenario,
  theme: Theme,
  pass: Pass = "normal",
): Promise<Capture> {
  const { page, kuri, duration, clip, cssPxPerUnit } = await prepareScenario(
    browser,
    options,
    scenario,
    theme,
    pass,
  );
  try {
    return {
      frames: await captureFrames(page, kuri, clip, duration),
      poses: await captureKeyPoses(page, kuri, clip, duration, scenario.keyPoses),
      duration,
      cssPxPerUnit,
    };
  } finally {
    await page.close();
  }
}

/** ホームを開いてくりを基準の姿勢で止め、演技を始めてすぐ一時停止する */
async function prepareScenario(
  browser: Browser,
  options: ReviewOptions,
  scenario: Scenario,
  theme: Theme,
  pass: Pass,
) {
  const page = await openPage(browser, `${options.baseUrl}/__test/home`, theme, {
    css: PASSES[pass],
  });
  const kuri = page.locator(".home-hero [data-kuri]");
  await kuri.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await rest(kuri);
  await page.waitForTimeout(150);

  const duration = await triggerAndPause(kuri, scenario.event);
  const box = await kuri.boundingBox();
  if (!box) throw new Error("くりが表示されていない");
  const viewBoxWidth = await kuri.evaluate((svg) => (svg as SVGSVGElement).viewBox.baseVal.width);
  // ジャンプの頂点まで収める
  const clip = await clipAround(kuri, {
    x: box.width * 0.25,
    top: box.height * 0.45,
    bottom: box.height * 0.1,
  });
  return { page, kuri, duration, clip, cssPxPerUnit: box.width / viewBoxWidth };
}

type Clip = Awaited<ReturnType<typeof clipAround>>;

/** 演技を始めてすぐ止め、総時間を返す。まばたきは他の動きの最中だと始まらないので、数回試す */
async function triggerAndPause(kuri: Locator, event: string): Promise<number> {
  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt) await kuri.page().waitForTimeout(300);
    const duration = await kuri.evaluate((svg, name) => {
      const before = new Set(svg.getAnimations({ subtree: true }));
      svg.dispatchEvent(new Event(name));
      const started = svg.getAnimations({ subtree: true }).filter((a) => !before.has(a));
      window.__kuriReview = started;
      for (const animation of started) animation.pause();
      return Math.max(0, ...started.map((a) => Number(a.effect?.getComputedTiming().endTime)));
    }, event);
    if (duration) return duration;
  }
  throw new Error(`${event}: アニメーションが開始されなかった`);
}

/** 止めた演技を指定の時刻へ動かし、その時刻の姿勢を測る */
const seekAndMeasure = (kuri: Locator, time: number) =>
  kuri.evaluate((svg, t) => {
    for (const animation of window.__kuriReview) animation.currentTime = t;
    const [action, follow, lid] = [".kuri__action", ".kuri__follow", ".kuri__eyelid"].map(
      (selector) =>
        new DOMMatrixReadOnly(getComputedStyle(svg.querySelector(selector) as Element).transform),
    );
    const eyelid = svg.querySelector(".kuri__eyelid") as SVGElement;
    return {
      ty: action.f,
      scaleX: Math.hypot(action.a, action.b),
      scaleY: Math.hypot(action.c, action.d),
      areaScale: Math.abs(action.a * action.d - action.b * action.c),
      eyeY: follow.f,
      drop: lid.f / Number(eyelid.dataset.drop),
    };
  }, time);

/** 1/60秒ごとの時刻。最後のコマが総時間ちょうどになるよう、終端を必ず含める */
function frameTimes(duration: number): number[] {
  const times: number[] = [];
  for (let t = 0; t < duration - TIME_EPSILON_MS; t += FRAME_MS) times.push(t);
  times.push(duration);
  return times;
}

/** 演技を1/60秒ごとにコマ送りして撮る */
async function captureFrames(page: Page, kuri: Locator, clip: Clip, duration: number) {
  const frames: Frame[] = [];
  for (const t of frameTimes(duration)) {
    const pose = await seekAndMeasure(kuri, t);
    frames.push({ t, ...pose, buffer: await page.screenshot({ clip }) });
  }
  return frames;
}

/** シナリオで決めたキーポーズの時刻で止めて撮る */
async function captureKeyPoses(
  page: Page,
  kuri: Locator,
  clip: Clip,
  duration: number,
  keyPoses: Scenario["keyPoses"],
) {
  const poses: Shot[] = [];
  for (const [label, ratio] of Object.entries(keyPoses)) {
    await seekAndMeasure(kuri, duration * ratio);
    poses.push({
      buffer: await page.screenshot({ clip }),
      label: `${label} ${Math.round(duration * ratio)}ms`,
    });
  }
  return poses;
}

// ---------------------------------------------------------------------------
// 何を成果物にするか
// ---------------------------------------------------------------------------

/** 等速の印象とキーポーズ: 全コマのフィルムストリップと、キーポーズの一覧 */
async function writeFilmstripAndPoses(
  artifact: ArtifactPath,
  scenario: Scenario,
  theme: Theme,
  capture: Capture,
) {
  const strip = capture.frames
    .filter((_, index) => scenario.everyFrame || index % 2 === 0)
    .map((frame) => ({ buffer: frame.buffer, label: `${Math.round(frame.t)}ms` }));
  await contactSheet(artifact(`${theme}-filmstrip.png`), strip, { columns: 12, height: 140 });
  await contactSheet(artifact(`${theme}-poses.png`), capture.poses, { columns: 12, height: 200 });
}

/** 速度とタイミング: カーブ、実時間のGIF、オニオンスキン */
async function writeMotionAnalysis(artifact: ArtifactPath, scenario: Scenario, capture: Capture) {
  const { frames } = capture;
  await lineChart(
    artifact("curves.png"),
    frames.map((frame) => frame.t),
    [
      { label: "translateY", color: "#2563eb", values: frames.map((f) => f.ty), range: [-140, 20] },
      {
        label: "velocityY",
        color: "#7c3aed",
        values: calculateVelocityY(frames),
        range: [-1500, 1500],
      },
      { label: "scaleX", color: "#dc2626", values: frames.map((f) => f.scaleX), range: [0.9, 1.1] },
      { label: "scaleY", color: "#16a34a", values: frames.map((f) => f.scaleY), range: [0.9, 1.1] },
      { label: "eyeY", color: "#ea580c", values: frames.map((f) => f.eyeY), range: [-15, 15] },
    ],
    scenario.name,
  );
  await writeRealtimeGif(artifact("1x.gif"), frames);
  const center = frameIndexAt(capture, poseRatio(scenario, scenario.onionPose));
  await writeOnionSkin(artifact("onion.png"), frames, center);
}

/** 前後2コマを薄く重ねる。重ねた形の間隔で、速度と軌道の乱れを見る */
async function writeOnionSkin(file: string, frames: Frame[], center: number): Promise<void> {
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
async function writeRealtimeGif(file: string, frames: Frame[]): Promise<void> {
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

// ---------------------------------------------------------------------------
// 何を合否判定するか
// ---------------------------------------------------------------------------

/** 関門の判定結果。合否と、判定の根拠にした値 */
interface GateResult {
  pass: boolean;
  [measure: string]: unknown;
}

/** シナリオに宣言した関門を順に判定する。結果は関門の種類ごとにまとめる */
function evaluateGates(scenario: Scenario, capture: Capture): Record<string, GateResult> {
  return Object.fromEntries(
    scenario.gates.map((gate) => [gate.kind, evaluateGate(gate, scenario, capture)]),
  );
}

function evaluateGate(gate: GateSpec, scenario: Scenario, capture: Capture): GateResult {
  switch (gate.kind) {
    case "contact":
      return evaluateContact(capture, gate.grounded);
    case "volume":
      return evaluateVolume(capture);
    case "landing":
      return evaluateLanding(capture, poseRatio(scenario, gate.impactPose));
    case "takeoff":
      return evaluateTakeoff(capture, poseRatio(scenario, gate.takeoffPose));
    case "blink":
      return evaluateBlink(capture);
  }
}

/**
 * 接地。足は体と同じパスで、伸縮の基準点は足元の線にあるため、
 * 体の縦位置のずれがそのまま足先と地面のずれになる
 */
function evaluateContact(
  { frames, duration, cssPxPerUnit }: Capture,
  grounded: [number, number][],
): GateResult {
  const isGrounded = ({ t }: Frame) =>
    grounded.some(
      ([from, to]) =>
        t >= duration * from - TIME_EPSILON_MS && t <= duration * to + TIME_EPSILON_MS,
    );
  const errors = frames.filter(isGrounded).map((frame) => Math.abs(frame.ty) * cssPxPerUnit);
  const worst = Math.max(0, ...errors);
  return { worstCssPx: +worst.toFixed(2), pass: worst <= GATE_LIMITS.contactCssPx };
}

function evaluateVolume({ frames }: Capture): GateResult {
  const areas = frames.map((frame) => frame.areaScale);
  const [min, max] = [Math.min(...areas), Math.max(...areas)];
  const { volume } = GATE_LIMITS;
  return {
    min: +min.toFixed(3),
    max: +max.toFixed(3),
    pass: min >= volume.min && max <= volume.max,
  };
}

/** 着地の直前のコマで、下向き（正）の速度が増え続けているか */
function evaluateLanding(capture: Capture, impactRatio: number): GateResult {
  const { frames, tolerance } = GATE_LIMITS.landing;
  const impact = frameIndexAt(capture, impactRatio);
  // 着地のコマがない、または手前のコマが足りないと、空の配列で誤って合格になる
  if (impact < frames) throw new Error(`landing: 着地の手前のコマが足りない (${impact})`);
  const before = calculateVelocityY(capture.frames).slice(impact - frames, impact);
  return {
    velocities: before.map(Math.round),
    pass: before.every((value, index) => index === 0 || value >= before[index - 1] - tolerance),
  };
}

/** 離陸の前後のコマで、速度が急に跳ね上がらないか */
function evaluateTakeoff(capture: Capture, takeoffRatio: number): GateResult {
  const takeoff = frameIndexAt(capture, takeoffRatio);
  const velocity = calculateVelocityY(capture.frames);
  const [before, after] = [Math.abs(velocity[takeoff]), Math.abs(velocity[takeoff + 1])];
  const ratio = after / Math.max(1, before);
  return {
    before: Math.round(before),
    after: Math.round(after),
    ratio: +ratio.toFixed(2),
    pass: ratio <= GATE_LIMITS.takeoffVelocityRatio,
  };
}

/** 閉じる途中が見えるコマ数と、閉じきったコマ数 */
function evaluateBlink({ frames }: Capture): GateResult {
  const { open, shut, minClosingFrames, minShutFrames, maxShutFrames } = GATE_LIMITS.blink;
  const firstShut = frames.findIndex((frame) => frame.drop >= shut);
  const closingFrames = frames.slice(0, firstShut).filter((frame) => frame.drop > open).length;
  const shutFrames = frames.filter((frame) => frame.drop >= shut).length;
  return {
    closingFrames,
    shutFrames,
    pass:
      closingFrames >= minClosingFrames &&
      shutFrames >= minShutFrames &&
      shutFrames <= maxShutFrames,
  };
}

// ---------------------------------------------------------------------------
// 計算の補助
// ---------------------------------------------------------------------------

/** シナリオのキーポーズの時刻（総時間に対する割合） */
function poseRatio(scenario: Scenario, pose: string): number {
  const ratio = scenario.keyPoses[pose];
  if (ratio === undefined) throw new Error(`${scenario.name}: キーポーズ「${pose}」がない`);
  return ratio;
}

/** 総時間に対する割合の時刻に、最初に達したコマの番号 */
function frameIndexAt({ frames, duration }: Capture, ratio: number): number {
  return frames.findIndex((frame) => frame.t >= duration * ratio - TIME_EPSILON_MS);
}

/** 体の縦方向の速度（viewBox単位/秒、下向きが正）。コマの実際の時間差で割る */
function calculateVelocityY(frames: Frame[]): number[] {
  return frames.map((frame, index) => {
    if (index === 0) return 0;
    const previous = frames[index - 1];
    return (frame.ty - previous.ty) / ((frame.t - previous.t) / 1000);
  });
}

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------

const options = readOptions();
const browser = await chromium.launch();
try {
  const report: Record<string, ScenarioReport> = {};
  for (const scenario of SCENARIOS) {
    report[scenario.name] = await reviewScenario(browser, options, scenario);
  }
  writeFileSync(path.join(options.outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
