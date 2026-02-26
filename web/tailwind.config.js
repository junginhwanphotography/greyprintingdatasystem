/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#fafafa",
        surface: "#ffffff",
        foreground: "#18181b",
        muted: "#71717a",
        primary: "#5899E8",
        border: "#e4e4e7",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "42rem",
      },
    },
  },
  plugins: [],
};
