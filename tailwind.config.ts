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
        warning: "rgb(var(--lt-warning) / <alpha-value>)",
        feather: "rgb(var(--lt-feather) / <alpha-value>)",
      },
      // Loonatic radius scale: 2px sharp signature / 4px subtle / 8px soft.
      // Everything >= lg collapses to the "soft" step per the guide.
      borderRadius: {
        DEFAULT: "var(--lt-radius-sm)",
        sm:  "var(--lt-radius-sm)",
        md:  "var(--lt-radius-md)",
        lg:  "var(--lt-radius-lg)",
        xl:  "var(--lt-radius-lg)",
        "2xl": "var(--lt-radius-lg)",
        "3xl": "var(--lt-radius-lg)",
      },
      boxShadow: {
        sm: "var(--lt-shadow-1)",
        DEFAULT: "var(--lt-shadow-2)",
        md: "var(--lt-shadow-2)",
        lg: "var(--lt-shadow-3)",
        inner: "var(--lt-shadow-inset)",
      },
      transitionDuration: {
        DEFAULT: "var(--lt-dur-med)",
        fast: "var(--lt-dur-fast)",
        slow: "var(--lt-dur-slow)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--lt-ease-out)",
        press: "var(--lt-ease-press)",
        smooth: "var(--lt-ease-smooth)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
