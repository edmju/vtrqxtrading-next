/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-yellow": "#FFD600",
      },
      boxShadow: {
        glow: "0 0 10px rgba(255, 214, 0, 0.3)",
      },
    },
  },
  plugins: [],
};
