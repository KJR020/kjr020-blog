type LogLevel = "error" | "warn" | "info";

export function log(level: LogLevel, fields: Record<string, unknown>): void {
  const fn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  fn(JSON.stringify({ level, ...fields }));
}

export function logError(fields: Record<string, unknown>): void {
  log("error", fields);
}
