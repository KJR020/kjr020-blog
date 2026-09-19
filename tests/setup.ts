import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// 各テスト後にReactのクリーンアップを実行
afterEach(() => {
  cleanup();
});
