import type { Config } from "tailwindcss";

// Calm ledger palette: warm paper canvas, dark ink text, a muted green as the
// single accent, and a soft amber for the "needs review" state.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f7f5ef", // warm off-white, like receipt stock
        card: "#fffdf8",
        ink: "#26302b",
        faint: "#7b8079",
        line: "#e6e2d8", // hairline rules, like a ledger
        moss: {
          50: "#f1f5f1",
          100: "#e0eae1",
          300: "#9fbaa2",
          500: "#4f7554",
          600: "#3d5c42",
          700: "#324a37",
        },
        amber: {
          50: "#fbf3e4",
          200: "#f0dcae",
          500: "#b8860b",
          700: "#8a6508",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: {
        ledger: "56rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
