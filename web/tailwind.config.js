/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        qe: {
          bg: "#0b0e11",
          panel: "#12161c",
          elevated: "#181d25",
          border: "#2a3340",
          muted: "#8b97a8",
          text: "#e8edf4",
          accent: "#3d8bfd",
          green: "#0ecb81",
          red: "#f6465d",
          amber: "#f0b90b",
          cyan: "#0ecbff",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px #2a3340",
      },
      keyframes: {
        "ticker-scroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "ticker-scroll": "ticker-scroll 60s linear infinite",
      },
    },
  },
  plugins: [],
};
