import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ig: {
          purple: "#833AB4",
          pink: "#E1306C",
          orange: "#F77737",
        },
      },
    },
  },
  plugins: [],
};

export default config;
