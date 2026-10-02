/** ログレベル。同名のconsoleメソッドで出力する。 */
type LogLevel = "error" | "warn" | "info";

/**
 * 1行のJSONとしてログを出力する。
 *
 * Workers Logsがフィールド単位で検索・集計できるよう、文字列の連結ではなく構造化して渡す。
 * Secretや上流の応答本文など、公開してはいけない値をfieldsに含めない。
 */
export function log(level: LogLevel, fields: Record<string, unknown>): void {
  console[level](JSON.stringify({ level, ...fields }));
}

export function logError(fields: Record<string, unknown>): void {
  log("error", fields);
}
