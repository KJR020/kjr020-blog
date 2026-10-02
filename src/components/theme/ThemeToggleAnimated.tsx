import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoonIcon } from "./MoonIcon";
import { SunIcon } from "./SunIcon";

// DOM状態から現在のテーマを取得（ThemeInit.astroで設定済み）
function getInitialTheme(): boolean {
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark");
  }
  return false;
}

export function ThemeToggleAnimated() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showWave, setShowWave] = useState(false);
  const [waveStyle, setWaveStyle] = useState<React.CSSProperties>({});
  const [iconPhase, setIconPhase] = useState<"idle" | "exit" | "enter">("idle");
  const buttonRef = useRef<HTMLButtonElement>(null);

  // マウント時にテーマ状態を同期
  useEffect(() => {
    setMounted(true);
    setIsDark(getInitialTheme());
  }, []);

  const toggleTheme = useCallback(() => {
    if (isAnimating) return;

    // 動きを減らす設定では、波と大きなアイコンを出さずにそのまま切り替える
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const newDark = !isDark;
      setIsDark(newDark);
      document.documentElement.classList.toggle("dark", newDark);
      document
        .querySelector('meta[name="color-scheme"]')
        ?.setAttribute("content", newDark ? "dark" : "light");
      localStorage.setItem("theme", newDark ? "dark" : "light");
      return;
    }

    // 波の起点を決定
    // ダーク→ライト: 左下から右上へ
    // ライト→ダーク: 右上から左下へ
    const waveX = isDark ? 0 : window.innerWidth;
    const waveY = isDark ? window.innerHeight : 0;

    // 画面の対角線の長さを計算（波が画面全体を覆うために必要な半径）
    const maxDistance = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);

    setIsAnimating(true);
    setIconPhase("exit");

    // 波のスタイルを設定
    setWaveStyle({
      left: waveX,
      top: waveY,
      width: maxDistance * 2,
      height: maxDistance * 2,
      transform: "translate(-50%, -50%) scale(0)",
    });
    setShowWave(true);

    // 波を広げる
    requestAnimationFrame(() => {
      setWaveStyle((prev) => ({
        ...prev,
        transform: "translate(-50%, -50%) scale(1)",
        transition: "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
      }));
    });

    // テーマを切り替え（波が半分くらい広がったタイミング）
    setTimeout(() => {
      const newDark = !isDark;
      setIsDark(newDark);
      document
        .querySelector('meta[name="color-scheme"]')
        ?.setAttribute("content", newDark ? "dark" : "light");
      if (newDark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      setIconPhase("enter");
    }, 300);

    // 波をフェードアウト
    setTimeout(() => {
      setShowWave(false);
    }, 600);

    // アニメーション完了
    setTimeout(() => {
      setIsAnimating(false);
      setIconPhase("idle");
      setWaveStyle({});
    }, 900);
  }, [isDark, isAnimating]);

  // SSRハイドレーション対策：マウント前はプレースホルダーを返す
  if (!mounted) {
    return (
      <button
        type="button"
        className="relative w-10 h-10 rounded-full flex items-center justify-center"
      >
        <div className="w-5 h-5" />
      </button>
    );
  }

  return (
    <>
      {/* 波オーバーレイ - React Portal でbody直下にレンダリング */}
      {createPortal(
        <div
          className={`fixed inset-0 z-60 pointer-events-none overflow-hidden transition-opacity duration-200 ${
            showWave ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* 波（円形に広がる） */}
          <div
            className="absolute rounded-full opacity-80"
            style={{
              ...waveStyle,
              // 切り替え先の紙色で塗る（globals.cssの--paperと同じ値）
              backgroundColor: isDark ? "oklch(98.4% 0.006 85)" : "oklch(16.8% 0.008 60)",
            }}
          />
        </div>,
        document.body,
      )}

      {/* アイコンオーバーレイ - React Portal でbody直下にレンダリング */}
      {createPortal(
        <div
          className={`fixed inset-0 z-70 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
            iconPhase !== "idle" ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="relative w-32 h-32">
            {/* 太陽アイコン（大）- ライトモードへ切り替え時に表示（下から上へ） */}
            <SunIcon
              strokeWidth={1.25}
              className={`absolute inset-0 w-full h-full text-foreground transition-all duration-300 ease-out ${
                !isDark && iconPhase === "enter"
                  ? "translate-y-0 opacity-100"
                  : !isDark && iconPhase === "exit"
                    ? "-translate-y-full opacity-0"
                    : isDark && iconPhase === "exit"
                      ? "translate-y-full opacity-0"
                      : "translate-y-full opacity-0"
              }`}
            />

            {/* 月アイコン（大）- ダークモードへ切り替え時に表示（上から下へ） */}
            <MoonIcon
              strokeWidth={1.25}
              className={`absolute inset-0 w-full h-full text-foreground transition-all duration-300 ease-out ${
                isDark && iconPhase === "enter"
                  ? "translate-y-0 opacity-100"
                  : isDark && iconPhase === "exit"
                    ? "translate-y-full opacity-0"
                    : !isDark && iconPhase === "exit"
                      ? "-translate-y-full opacity-0"
                      : "-translate-y-full opacity-0"
              }`}
            />
          </div>
        </div>,
        document.body,
      )}

      {/* トグルボタン */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleTheme}
        disabled={isAnimating}
        className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors disabled:cursor-not-allowed z-50"
        aria-label="テーマを切り替える"
      >
        <div className="relative w-5 h-5 overflow-hidden">
          {/* 太陽アイコン（小） */}
          <SunIcon
            className={`absolute inset-0 w-full h-full text-foreground transition-all duration-300 ease-out ${
              isDark ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
            }`}
          />

          {/* 月アイコン（小） */}
          <MoonIcon
            className={`absolute inset-0 w-full h-full text-foreground transition-all duration-300 ease-out ${
              isDark ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
            }`}
          />
        </div>
      </button>
    </>
  );
}
