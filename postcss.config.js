// postcss.config.js
module.exports = {
  plugins: { // This 'plugins' property MUST be an object
    tailwindcss: {}, // This tells PostCSS to use the Tailwind CSS plugin
    autoprefixer: {}, // Autoprefixer is also typically included for browser compatibility
  },
};