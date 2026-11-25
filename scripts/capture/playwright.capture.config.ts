import { defineConfig } from "@playwright/test";

// Agent-made demo recordings of the live public wine apps. Separate from playwright.config.ts
// (testDir "e2e"), so `npm run test:e2e` never runs these. Run with:
//   npx playwright test -c scripts/capture/playwright.capture.config.ts
// Raw .webm videos land in scripts/capture/out/ (gitignored); move them to media/raw/.
// The class-tasting capture lives in the private class-tasting workflow (gitignored scripts/capture/private/), not here.
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
    // Software WebGL: default headless Chromium takes ~54 s to finish the wine journal's 3D cellar,
    // SwiftShader ~18 s (measured 2026-11-25).
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
});
