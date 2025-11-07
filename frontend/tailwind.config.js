/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Brand Colors
        'pitch-black': '#000000',
        'premium-orange': '#ffc241',

        // Extended Palette
        'deep-space': '#0a0a0a',
        'charcoal': '#111111',
        'golden-glow': '#ffd700',
        'burnt-orange': '#e6ac00',

        // Functional Colors
        'vegetarian-green': '#059669',
        'warm-orange': '#EA580C',

        // Trading Specific
        'bullish-green': '#00ff88',
        'bearish-red': '#ff3366',
        'neutral-blue': '#00ccff',
      },
      backgroundImage: {
        'black-to-orange': 'linear-gradient(135deg, #000000 0%, #ffc241 100%)',
        'orange-glow': 'linear-gradient(135deg, #ffc241 0%, #ffd700 100%)',
        'deep-shadow': 'linear-gradient(135deg, #0a0a0a 0%, #000000 100%)',
      }
    },
  },
  plugins: [],
}

