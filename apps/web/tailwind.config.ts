import type { Config } from "tailwindcss";

// Light product surface: white ground, soft neutral panels, warm amber accent.
// Depth comes from real shadows and hairline borders rather than glow.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Ground
        base: "#ffffff",
        base2: "#f7f8fa",
        // Panels sit on the ground; borders are dark at very low alpha.
        panel: "#ffffff",
        panelhi: "#fbfcfd",
        edge: "rgba(15,23,42,0.09)",
        edgehi: "rgba(15,23,42,0.16)",
        // Type — slate ramp, high contrast on white.
        hi: "#0f172a",
        mid: "#5b6675",
        lo: "#8d97a5",
        // Accent — warm amber, deepened so it passes contrast on white.
        amber: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        // States
        flag: "#e11d48", // needs review
        flagdim: "#fff1f3",
        ok: "#059669",
        okdim: "#ecfdf5",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        xl2: "1.125rem",
      },
      boxShadow: {
        // Layered, tight shadows — the light-mode equivalent of "lifted".
        lift: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.12)",
        liftup:
          "0 2px 4px rgba(15,23,42,0.05), 0 16px 36px -14px rgba(15,23,42,0.18)",
        glow: "0 0 0 1px rgba(245,158,11,0.35), 0 12px 32px -12px rgba(245,158,11,0.3)",
        flag: "0 0 0 1px rgba(225,29,72,0.18), 0 12px 32px -16px rgba(225,29,72,0.25)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.995)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        fade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "70%": { transform: "scale(1.35)", opacity: "0" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 0.45s cubic-bezier(0.16,1,0.3,1) both",
        fade: "fade 0.4s ease-out both",
        shimmer: "shimmer 1.8s infinite",
        scanline: "scanline 2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        pulseRing: "pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite",
        countUp: "countUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
