import { defineConfig } from "@playwright/test";

// Agent-made demo recordings of the live public wine apps. Separate from playwright.config.ts
// (testDir "e2e"), so `npm run test:e2e` never runs these. Run with:
//   npx playwright test -c scripts/capture/playwright.capture.config.ts
// Raw .webm videos land in scripts/capture/out/ (gitignored); move them to media/raw/.
const VIEWPORT = { width: 390, height: 844 };

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.capture\.ts$/,
  outputDir: "out",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: "list",
  use: {
    browserName: "chromium",
    viewport: VIEWPORT,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    video: { mode: "on", size: VIEWPORT },
  },
});
