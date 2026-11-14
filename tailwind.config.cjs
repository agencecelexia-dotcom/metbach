/** Compile the classes used by every public page and client-side interaction. */
module.exports = {
  content: ['./*.html', './services/*.html', './villes/*.html', './contact/*.html', './realisations/*.html', './merci/*.html', './js/*.js'],
  theme: {
    extend: {
      colors: {
        page: '#F7F4EE', ink: '#0E1318', 'ink-2': '#1B2A3A',
        accent: '#B8602A', 'accent-dark': '#8A4520', 'accent-soft': '#F3DEC8',
        forest: '#2D5F3F', line: '#E7E1D5', muted: '#5B6677',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      maxWidth: { '7xl-plus': '84rem' },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
