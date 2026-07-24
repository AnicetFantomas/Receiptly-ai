import type { Config } from "tailwindcss";

// A real product surface: deep slate ground, layered translucent panels, and a
// warm amber accent that carries the "paper/receipt" warmth without costume.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Ground: near-black with a blue cast, so accents glow against it.
        base: "#0b0f14",
        base2: "#0f151c",
        // Panels sit above the ground; borders are light at very low alpha.
        panel: "rgba(255,255,255,0.035)",
        panelhi: "rgba(255,255,255,0.06)",
        edge: "rgba(255,255,255,0.09)",
        edgehi: "rgba(255,255,255,0.16)",
        // Type
        hi: "#f2f5f8",
        mid: "#9aa7b4",
        lo: "#5f6b78",
        // Accent — warm amber, the "receipt paper" note, used for emphasis.
        amber: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        // States
        flag: "#fb7185", // needs review
        flagdim: "rgba(251,113,133,0.12)",
        ok: "#34d399",
        okdim: "rgba(52,211,153,0.12)",
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
        lift: "0 1px 0 rgba(255,255,255,0.05) inset, 0 10px 30px -12px rgba(0,0,0,0.7)",
        glow: "0 0 0 1px rgba(245,158,11,0.28), 0 12px 40px -12px rgba(245,158,11,0.35)",
        flag: "0 0 0 1px rgba(251,113,133,0.28), 0 12px 40px -14px rgba(251,113,133,0.3)",
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
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
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
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
