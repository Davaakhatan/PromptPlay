/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Dark Palette
        canvas: '#0f0f12', // Deepest background
        panel: '#1e1e24', // Solid panel background
        surface: '#252530', // Surface background for dialogs/modals
        subtle: 'rgba(255, 255, 255, 0.08)', // Subtle borders/dividers
        
        // Accents
        primary: {
          DEFAULT: '#6366f1', // Indigo-500
          hover: '#4f46e5',   // Indigo-600
          glow: 'rgba(99, 102, 241, 0.5)',
        },
        
        // Text
        'text-primary': '#f4f4f5', // Zinc-100
        'text-secondary': '#a1a1aa', // Zinc-400
        'text-tertiary': '#52525b', // Zinc-600
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
