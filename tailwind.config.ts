import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Loonatic palette — CSS-var triplets so the admin Styleguide tab
        // can re-brand at runtime; defaults live in globals.css :root.
        // rgb(var() / <alpha-value>) keeps /opacity utilities working. ----
        ink:     "rgb(var(--lt-ink) / <alpha-value>)",        // deep base
        abyss:   "rgb(var(--lt-abyss) / <alpha-value>)",      // darkest, hero vignette
        panel:   "rgb(var(--lt-panel) / <alpha-value>)",      // content panel
        surface: "rgb(var(--lt-surface) / <alpha-value>)",    // inputs, cards
        edge:    "rgb(var(--lt-edge) / <alpha-value>)",       // hairline borders
        hair:    "rgb(var(--lt-hair) / <alpha-value>)",       // lifted hairline
        loon:    "rgb(var(--lt-loon) / <alpha-value>)",       // legacy cyan
        sky: {
          DEFAULT: "rgb(var(--lt-sky) / <alpha-value>)",
          light:   "rgb(var(--lt-sky-light) / <alpha-value>)",
          deep:    "rgb(var(--lt-sky-deep) / <alpha-value>)",
        },
        teal: {
          DEFAULT: "rgb(var(--lt-teal) / <alpha-value>)",
          soft:    "rgb(var(--lt-teal-soft) / <alpha-value>)",
        },
        link:    "rgb(var(--lt-link) / <alpha-value>)",
        follow:  "rgb(var(--lt-follow) / <alpha-value>)",
        mist:    "rgb(var(--lt-mist) / <alpha-value>)",
        foam:    "rgb(var(--lt-foam) / <alpha-value>)",
        loonred: "rgb(var(--lt-loonred) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
