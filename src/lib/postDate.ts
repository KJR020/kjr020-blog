/**
 * 記事の日付を解釈するタイムゾーン。
 *
 * 記事のfrontmatterは日本時間で書いている。ビルド環境 (CIはUTC) のタイムゾーンで
 * 解釈すると、日本時間の0時〜9時の記事が前日として表示されるため、明示的に固定する。
 */
const POST_TIME_ZONE = "Asia/Tokyo";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: POST_TIME_ZONE,
});

const monthDayFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "long",
  day: "numeric",
  timeZone: POST_TIME_ZONE,
});

const yearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: POST_TIME_ZONE,
});

/** 記事の公開日を「2026年9月15日」の形式で返す。 */
export function formatPostDate(date: Date): string {
  return dateFormatter.format(date);
}

/** 年見出しの下に並べる記事の日付を「9月15日」の形式で返す。 */
export function formatPostMonthDay(date: Date): string {
  return monthDayFormatter.format(date);
}

/** 記事一覧の年見出しに使う、日本時間での年を返す。 */
export function getPostYear(date: Date): number {
  return Number(yearFormatter.format(date));
}
