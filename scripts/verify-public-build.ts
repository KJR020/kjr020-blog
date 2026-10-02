#!/usr/bin/env tsx

// `pnpm build` の後処理。公開すべきページだけが成果物に入っているかを検査する。
// テストビルドでは`--allow-test-fixtures`を付け、テスト用fixtureの出力を許可する。

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { findPublicBuildOutputProblems } from "../src/lib/publicBuildOutput";

const outputDir = "dist";

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = path.join(directory, entry);
    const stats = statSync(filePath);
    return stats.isDirectory() ? listFiles(filePath) : [filePath];
  });
}

const files = listFiles(outputDir).map((filePath) =>
  path.relative(outputDir, filePath).split(path.sep).join("/"),
);

const problems = findPublicBuildOutputProblems({
  files,
  readFile: (file) => readFileSync(path.join(outputDir, file), "utf8"),
  allowsTestFixtures: process.argv.includes("--allow-test-fixtures"),
});

if (problems.length > 0) {
  console.error("Public build output check failed:");
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}
