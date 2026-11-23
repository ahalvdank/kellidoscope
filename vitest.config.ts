/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Unit tests only; e2e/ holds Playwright specs run by `npm run test:e2e`.
// getViteConfig lets tests render .astro components through the Astro container API.
export default getViteConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
