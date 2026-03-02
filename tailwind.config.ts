import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        budget: {
          50: "#f0f7ff",
          100: "#e0efff",
          200: "#b8dbff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        over: {
          50: "#fff5f5",
          100: "#ffe3e3",
          500: "#ef4444",
          600: "#dc2626",
        },
        under: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
