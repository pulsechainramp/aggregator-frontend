const theme = require("./src/theme/tokens.json");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    institutionalLight: theme.institutionalLight,
    extend: {
      colors: {
        bg: {
          page: "var(--bg-page)",
          surface: "var(--bg-surface)",
          raised: "var(--bg-raised)",
        },
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
          subtle: "var(--text-subtle)",
          inverse: "var(--text-inverse)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          600: "var(--primary-600)",
          50: "var(--primary-050)",
        },
        accent: "var(--accent)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        focus: "var(--focus)",
        overlay: "var(--overlay)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-1)",
        md: "var(--shadow-2)",
        lg: "var(--shadow-3)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        base: ["18px", "1.65"],
        sm: ["16px", "1.6"],
        lg: ["20px", "1.6"],
      },
      spacing: {
        touch: "2.75rem",
      },
      animation: {
        "spin-slow": "spin 20s linear infinite",
      },
      screens: {
        logo: "410px",
        nav: "970px",
        header: "1164px",
        theme: "1070px",
        network: "1250px",
      },
    },
  },
  plugins: [],
};
