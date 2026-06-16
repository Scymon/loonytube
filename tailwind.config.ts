import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Loonatic palette (sampled from Figma mockups) ----
        ink: "#0a0e14",        // deep base (legacy alias, hero deeps)
        abyss: "#070b11",      // darkest, hero vignette
        panel: "#111217",      // right-hand content panel
        surface: "#181b22",    // inputs, cards
        edge: "#242833",       // hairline borders
        hair: "#2d3340",       // lifted hairline
        loon: "#22d3ee",       // legacy cyan (kept for existing components)
        sky: { DEFAULT: "#62b8e6", light: "#7dd0f2", deep: "#4fa6e4" }, // primary CTA
        teal: { DEFAULT: "#2dd4b4", soft: "#55c9b6" },                  // accent
        link: "#3fa2f0",       // bright inline links
        follow: "#3b82f6",     // "Follow" outline blue
        mist: "#8a98a8",       // muted text
        foam: "#eef5fb",       // bright text
        loonred: "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
