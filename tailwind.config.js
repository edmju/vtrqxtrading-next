/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#050505',
        'bg-glass': 'rgba(15,15,15,0.6)',
        'neon-yellow': '#FFD600',
        'neon-cyan': '#00E5FF',
        'neon-purple': '#8A2BE2',
        'neon-green': '#00FF85',
        'neon-red': '#FF3B6B',
        'text-main': '#EAEAEA',
        'text-dim': '#A1A1A1',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(0,229,255,0.3)',
        yellow: '0 0 25px rgba(255,214,0,0.3)',
        purple: '0 0 25px rgba(138,43,226,0.3)',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        gradient: 'gradient 6s ease infinite',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
