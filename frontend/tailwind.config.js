/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  "#EFF3FB",
          100: "#D8E1F5",
          200: "#B1C3EB",
          300: "#8AA4E0",
          400: "#6386D6",
          500: "#3C68CC",
          600: "#1E40AF",
          700: "#1E3A8A",
          800: "#152B68",
          900: "#0C1C46",
        },
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#B45309",
          700: "#92400E",
        },
        ink: {
          50:  "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        }
      },
      fontFamily: {
        display: ["EB Garamond", "Georgia", "serif"],
        body:    ["Lato", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-up":     "fadeUp 0.6s ease forwards",
        "fade-in":     "fadeIn 0.4s ease forwards",
        "pulse-slow":  "pulse 3s infinite",
        "spin-slow":   "spin 3s linear infinite",
        "score-fill":  "scoreFill 1.5s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scoreFill: {
          "0%":   { "stroke-dashoffset": "283" },
          "100%": { "stroke-dashoffset": "var(--score-offset)" },
        },
      },
      boxShadow: {
        "navy":  "0 4px 24px rgba(30, 58, 138, 0.15)",
        "amber": "0 4px 24px rgba(180, 83, 9, 0.15)",
        "card":  "0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
      }
    },
  },
  plugins: [],
};
