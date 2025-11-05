/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#07090B",
        card: "#0E1216",
        primary: "#FFD54A",
        primarySoft: "#FFE483",
        cyan: "#22D3EE",
        blue: "#3B82F6",
        line: "#1A1F25",
      },
      boxShadow: {
        glow: "0 0 30px rgba(255, 213, 74, 0.35)",
        cyan: "0 0 30px rgba(34, 211, 238, 0.35)",
        blue: "0 0 30px rgba(59, 130, 246, 0.35)",
        card: "0 8px 40px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
