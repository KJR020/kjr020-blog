/// <reference types="vitest" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/src/**/*.test.{ts,tsx}", "tests/worker/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "worker/**/*.ts",
        "src/lib/**/*.ts",
        "src/components/**/use*.ts",
        "src/components/scrapbox/queryClient.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        "**/*.astro",
        "**/__mocks__/**",
        "node_modules/**",
        "dist/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
