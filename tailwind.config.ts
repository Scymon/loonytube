import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Loon palette: deep northwoods night + lake-ice accent
        ink: "#0a0e14",
        panel: "#121823",
        edge: "#1f2937",
        loon: "#22d3ee",   // lake-ice cyan accent
        loonred: "#ef4444" // loon-eye red, used sparingly
      },
    },
  },
  plugins: [],
} satisfies Config;
