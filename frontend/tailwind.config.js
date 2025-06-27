// tailwind.config.js
export default {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"], // ✅ include jsx and tsx if you're using React
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      animation: {
        'gradient-x': 'gradient-x 6s ease infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
      backgroundSize: {
        '400%': '400% 400%',
      },
    },
  },
  plugins: [],
}
