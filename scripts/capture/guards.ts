import { expect, type Page } from "@playwright/test";

/**
 * Fails the capture if the page ever talks to an account backend (Supabase, auth or sign-in endpoints).
 * The recordings must use only public, signed-out flows; returns the list so the test can assert it is empty.
 */
export function watchAccountRequests(page: Page): string[] {
  const hits: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/supabase\.co|\/auth\/|\/login|\/signin|\/sign-in|\/oauth/i.test(url)) hits.push(url);
  });
  return hits;
}

/** Fails if a sign-in wall, consent prompt or personal-data form is on screen; captures must stop there. */
export async function expectNoGate(page: Page): Promise<void> {
  await expect(page.getByRole("dialog", { name: /cookie|consent|sign in|log in/i })).toHaveCount(0);
  await expect(page.getByLabel(/email|password/i)).toHaveCount(0);
}

/** A short visible pause so a viewer can follow each step in the recording. */
export const beat = (page: Page, ms = 450): Promise<void> => page.waitForTimeout(ms);
