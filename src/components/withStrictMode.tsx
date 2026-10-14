import { type ComponentType, StrictMode } from "react";

/**
 * React IslandとしてAstroから読み込む部品を、Strict Modeで包む
 * 部品が自分の戻り値を<StrictMode>で包んでも、その部品自身は検査されない。
 * 部品自身の描画とhookも検査するため、外側から包む
 */
export function withStrictMode<Props extends object>(Component: ComponentType<Props>) {
  function StrictIsland(props: Props) {
    return (
      <StrictMode>
        <Component {...props} />
      </StrictMode>
    );
  }

  StrictIsland.displayName = `withStrictMode(${Component.displayName ?? Component.name})`;
  return StrictIsland;
}
