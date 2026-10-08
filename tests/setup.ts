import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// 描画とeffectを追加で実行し、副作用の漏れを表に出す。
// ブラウザのアイランドでは検査されない、初回マウントのeffectもここで検査する
configure({ reactStrictMode: true });

// 各テスト後にReactのクリーンアップを実行
afterEach(() => {
  cleanup();
});
