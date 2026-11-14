/** Compile the classes used by every public page and client-side interaction. */
module.exports = {
  content: ['./*.html', './services/*.html', './villes/*.html', './contact/*.html', './realisations/*.html', './merci/*.html', './js/*.js'],
  theme: {
    extend: {
      colors: {
        page: '#F7F5F0', ink: '#163C34', 'ink-2': '#21483F',
        accent: '#A84D2C', 'accent-dark': '#8D3F23', 'accent-soft': '#EFE2D2',
        forest: '#345D48', line: '#DDDCD2', muted: '#5E6862',
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
