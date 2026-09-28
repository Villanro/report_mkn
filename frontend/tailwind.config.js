/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        kpi: {
          green: "#1b7f3a",
          "green-bg": "#e3f5e9",
          yellow: "#8a6d00",
          "yellow-bg": "#fff6d6",
          red: "#b3261e",
          "red-bg": "#fbe4e2",
        },
      },
    },
  },
  plugins: [],
};
