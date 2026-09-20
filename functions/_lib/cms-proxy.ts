import type { ScrapboxApiPage } from "./types";

const UPSTREAM_BASE = "https://scrapbox.io/api/pages";
const PROJECT_NAME_PATTERN = /^[\w-]+$/;
/**
 * プロジェクト名の最大長。Scrapbox 公式の実際のプロジェクト名は十数文字オーダーで収まるため
 * 64 文字を上限とする。極端に長い入力 (数 KB 等) での DoS / ログ肥大化を防ぐための境界。
 */
const PROJECT_NAME_MAX_LENGTH = 64;

/** Proxy の出力型（フロントエンドとの契約）。src/components/scrapbox/types.ts と同期する。 */
export interface PageData {
  id: string;
  title: string;
  imageUrl: string | null;
  description: string;
  updatedAt: string;
  url: string;
}

export type ProxyResult =
  | { ok: true; pages: PageData[] }
  | {
      ok: false;
      code: "network_error" | "timeout" | "upstream_error";
      message: string;
      status?: number;
    };

/** プロジェクト名が許可された文字種と長さに収まるか検証する。 */
export function validateProject(project: string): boolean {
  if (typeof project !== "string") return false;
  if (project.length === 0 || project.length > PROJECT_NAME_MAX_LENGTH) return false;
  return PROJECT_NAME_PATTERN.test(project);
}

type PublicPageFields = Pick<
  ScrapboxApiPage,
  "id" | "title" | "image" | "descriptions" | "updated"
>;

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
    typeof page.updated === "number" &&
    Number.isFinite(page.updated) &&
    Number.isFinite(page.updated * 1000) &&
    !Number.isNaN(new Date(page.updated * 1000).getTime())
  );
}

/** Cosenseのページをブログ向けの公開データへ変換する。 */
function transformPage(page: PublicPageFields, project: string): PageData {
  return {
    id: page.id,
    title: page.title,
    imageUrl: page.image,
    description: page.descriptions.slice(0, 3).join(" "),
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
  const timeout = setTimeout(() => controller.abort(), 5_000);
  let response: Response;
  try {
    response = await fetch(`${UPSTREAM_BASE}/${project}${search}`, {
      headers: { Cookie: `connect.sid=${scrapboxSid}` },
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      return { ok: false, code: "timeout", message: "Upstream timeout" };
    }
    return { ok: false, code: "network_error", message: String(error) };
  }

  if (!response.ok) {
    clearTimeout(timeout);
    return {
      ok: false,
      code: "upstream_error",
      message: "Upstream error",
      status: response.status,
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      return { ok: false, code: "timeout", message: "Upstream timeout" };
    }
    return {
      ok: false,
      code: "upstream_error",
      message: "Invalid response body",
      status: response.status,
    };
  }
  clearTimeout(timeout);

  try {
    if (
      data === null ||
      typeof data !== "object" ||
      !("pages" in data) ||
      !Array.isArray(data.pages) ||
      !data.pages.every(isPublicPage)
    ) {
      throw new Error("Invalid page list");
    }
    const pages = data.pages.map((page) => transformPage(page, project));
    return { ok: true, pages };
  } catch {
    return {
      ok: false,
      code: "upstream_error",
      message: "Invalid response body",
      status: response.status,
    };
  }
}
