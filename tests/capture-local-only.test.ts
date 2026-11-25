import { describe, expect, it } from "vitest";
import { isLocalUrl } from "../scripts/capture/local-only";

describe("isLocalUrl (local-only capture guard)", () => {
  it.each([
    "http://localhost:5173/app",
    "http://localhost:5173/src/main.tsx?t=1",
    "ws://localhost:5173/?token=hmr",
    "http://127.0.0.1:54321/rest/v1/items",
    "http://127.0.0.1:54321/functions/v1/example",
    "postgresql://127.0.0.1:54322/postgres",
    "data:image/png;base64,AAAA",
    "blob:http://localhost:5173/0b7c",
  ])("allows %s", (url) => {
    expect(isLocalUrl(url)).toBe(true);
  });

  it.each([
    "https://app.example.com/",
    "https://abcdefghijklmnop.supabase.co/rest/v1/items",
    "postgresql://db.abcdefghijklmnop.supabase.co:5432/postgres",
    "http://localhost.evil.example/",
    "http://127.0.0.1.nip.io/",
    "https://fonts.googleapis.com/css2?family=Inter",
    "http://192.168.1.10:5173/",
    "blob:https://app.example.com/0b7c",
    "not a url",
  ])("refuses %s", (url) => {
    expect(isLocalUrl(url)).toBe(false);
  });
});
