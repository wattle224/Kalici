import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          0: "#060608",
          1: "#0a0a0d",
          2: "#101014",
          3: "#15151b",
        },
        edge: {
          red: "#7a0b16",
          crimson: "#a01324",
          salmon: "#ff8a7a",
          pale: "#ffb4a6",
          amber: "#ffb020",
          green: "#2fe08a",
          mute: "#6b6b76",
          grid: "#1e1e26",
          text: "#e6e6ea",
          dim: "#9a9aa6",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        panel: "inset 0 0 0 1px rgba(160,19,36,0.35)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        pulse2: {
          "0%,100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        scan: "scan 6s linear infinite",
        pulse2: "pulse2 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
