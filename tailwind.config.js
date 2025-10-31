/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0A0A0A',
        'neon-yellow': '#FFD600',
        'neon-cyan': '#00E5FF',
        'neon-purple': '#7F00FF',
        'text-primary': '#E6E6E6',
        'text-secondary': '#A0A0A0',
      },
      boxShadow: {
        glow: '0 0 25px rgba(0,229,255,0.3)',
        yellow: '0 0 25px rgba(255,214,0,0.3)',
      },
      backdropBlur: {
        xs: '4px',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
