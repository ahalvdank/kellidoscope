import { defineConfig, devices } from "@playwright/test";

const PORT = 4399;

// Serves the built dist/ with vercel.json's headers; run `npm run build` first.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // At least 1024 px wide: below that a citation opens the mobile <dialog> instead.
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "node e2e/serve-dist.mjs",
    url: `http://127.0.0.1:${PORT}/demos/10k-kb/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 900 } } },
  ],
});
