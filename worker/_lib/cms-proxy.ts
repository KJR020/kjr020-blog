import type { ScrapboxApiPage } from "./types";

const UPSTREAM_BASE = "https://scrapbox.io/api/pages";
/** 上流への接続開始からJSON本文の読み取り完了までの制限時間。 */
const UPSTREAM_TIMEOUT_MS = 5_000;
const PROJECT_NAME_PATTERN = /^[\w-]+$/;
/**
 * プロジェクト名の最大長。Scrapbox 公式の実際のプロジェクト名は十数文字オーダーで収まるため
 * 64 文字を上限とする。極端に長い入力 (数 KB 等) での DoS / ログ肥大化を防ぐための境界。
 */
const PROJECT_NAME_MAX_LENGTH = 64;
/** 説明文として公開する、ページ冒頭の行数。 */
const DESCRIPTION_LINE_COUNT = 3;

/** Proxy の出力型（フロントエンドとの契約）。src/components/scrapbox/types.ts と同期する。 */
export interface PageData {
  id: string;
  title: string;
  imageUrl: string | null;
  description: string;
  updatedAt: string;
  url: string;
}

export type ProxyFailure = {
  ok: false;
  code: "network_error" | "timeout" | "upstream_error";
  message: string;
  status?: number;
};

export type ProxyResult = { ok: true; pages: PageData[] } | ProxyFailure;

const UPSTREAM_TIMEOUT: ProxyFailure = { ok: false, code: "timeout", message: "Upstream timeout" };

function invalidResponseBody(status: number): ProxyFailure {
  return { ok: false, code: "upstream_error", message: "Invalid response body", status };
}

/** プロジェクト名が許可された文字種と長さに収まるか検証する。 */
export function validateProject(project: string): boolean {
  if (project.length === 0 || project.length > PROJECT_NAME_MAX_LENGTH) return false;
  return PROJECT_NAME_PATTERN.test(project);
}

type PublicPageFields = Pick<
  ScrapboxApiPage,
  "id" | "title" | "image" | "descriptions" | "updated"
>;

/** Unix秒として日時へ変換できる値か検証する。NaN、Infinity、Dateの範囲を超える値を除く。 */
function isUnixSeconds(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(new Date(value * 1000).getTime());
}

/** Cosenseのページが公開レスポンスに必要なフィールドを持つか検証する。 */
function isPublicPage(value: unknown): value is PublicPageFields {
  if (value === null || typeof value !== "object") return false;
  const page = value as Record<string, unknown>;
  return (
    typeof page.id === "string" &&
    typeof page.title === "string" &&
    (typeof page.image === "string" || page.image === null) &&
    Array.isArray(page.descriptions) &&
    page.descriptions.every((line) => typeof line === "string") &&
    isUnixSeconds(page.updated)
  );
}

/** Cosense APIの応答が、公開できるページだけを並べた一覧か検証する。 */
function isPublicPageList(value: unknown): value is { pages: PublicPageFields[] } {
  return (
    value !== null &&
    typeof value === "object" &&
    "pages" in value &&
    Array.isArray(value.pages) &&
    value.pages.every(isPublicPage)
  );
}

/** Cosenseのページをブログ向けの公開データへ変換する。 */
function transformPage(page: PublicPageFields, project: string): PageData {
  return {
    id: page.id,
    title: page.title,
    imageUrl: page.image,
    description: page.descriptions.slice(0, DESCRIPTION_LINE_COUNT).join(" "),
    updatedAt: new Date(page.updated * 1000).toISOString(),
    url: `https://scrapbox.io/${project}/${encodeURIComponent(page.title)}`,
  };
}

/** Cosense APIからページを取得し、検証済みの公開データを返す。 */
export async function fetchPages(
  project: string,
  search: string,
  scrapboxSid: string,
): Promise<ProxyResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetchPagesUntilAborted(project, search, scrapboxSid, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPagesUntilAborted(
  project: string,
  search: string,
  scrapboxSid: string,
  signal: AbortSignal,
): Promise<ProxyResult> {
  let response: Response;
  try {
    response = await fetch(`${UPSTREAM_BASE}/${project}${search}`, {
      headers: { Cookie: `connect.sid=${scrapboxSid}` },
      // 認証Cookieを別ホストへ転送しないよう、リダイレクトは追わずエラーとして扱う。
      redirect: "manual",
      signal,
    });
  } catch (error) {
    if (signal.aborted) return UPSTREAM_TIMEOUT;
    return { ok: false, code: "network_error", message: String(error) };
  }

  if (!response.ok) {
    return {
      ok: false,
      code: "upstream_error",
      message: "Upstream error",
      status: response.status,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (signal.aborted) return UPSTREAM_TIMEOUT;
    return invalidResponseBody(response.status);
  }

  if (!isPublicPageList(body)) return invalidResponseBody(response.status);

  try {
    return { ok: true, pages: body.pages.map((page) => transformPage(page, project)) };
  } catch {
    // 孤立サロゲートを含むタイトルは、URL生成時のencodeURIComponentがURIErrorを投げる。
    return invalidResponseBody(response.status);
  }
}
