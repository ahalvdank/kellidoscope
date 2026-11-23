import { defineConfig } from "vitest/config";

// Unit tests only; e2e/ holds Playwright specs run by `npm run test:e2e`.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
