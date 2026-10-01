import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * globals.cssの`@theme`で登録したφスペーシング（`--spacing-phi-*`）。
 * tailwind-mergeへ登録しないと`gap-phi-xl`と`gap-phi-2xs`を同じ用途と判定できず、
 * 両方が残ってCSSの出現順で勝敗が決まる。
 */
const PHI_SPACING = [
  "phi-3xs",
  "phi-2xs",
  "phi-xs",
  "phi-sm",
  "phi-md",
  "phi-lg",
  "phi-xl",
  "phi-2xl",
  "phi-3xl",
];

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: PHI_SPACING,
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
