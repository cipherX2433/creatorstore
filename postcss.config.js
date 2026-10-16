module.exports = {
    plugins: {
      // Must run before tailwindcss so that `@import './tokens.css'` in
      // globals.css is inlined first. Without it, Next's css-loader resolves
      // the import only after PostCSS, and tokens.css gets its own Tailwind
      // pass where its `@layer base` has no matching `@tailwind base`.
      'postcss-import': {},
      tailwindcss: {},
      autoprefixer: {},
    },
  }
