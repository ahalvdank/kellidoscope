import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        editorial: {
          bg: "var(--editorial-bg)",
          surface: "var(--editorial-surface)",
          ink: "var(--editorial-ink)",
          muted: "var(--editorial-muted)",
          border: "var(--editorial-border)",
          accent: "var(--editorial-accent)",
        },
        workspace: {
          bg: "var(--workspace-bg)",
          surface: "var(--workspace-surface)",
          ink: "var(--workspace-ink)",
          muted: "var(--workspace-muted)",
          border: "var(--workspace-border)",
        },
      },
    },
  },
  plugins: [typography],
};
