import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import {
  color,
  font,
  space,
  radius,
  shadow,
  duration,
  iconography,
} from "./design_rules/b2s-design-tokens/tokens";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // B2S Design System tokens (mutable copies)
      fontFamily: {
        sans: [font.family.base],
        mono: [font.family.mono],
      },
      fontSize: { ...font.size },
      spacing: { ...space },
      boxShadow: { ...shadow },
      transitionDuration: { ...duration },
      // shadcn/ui + B2S semantic color aliases
      colors: {
        // B2S primitive palettes
        blue: { ...color.blue },
        green: { ...color.green },
        red: { ...color.red },
        amber: { ...color.amber },
        neutral: { ...color.neutral },
        "b2s-warm-red": { ...color.b2s.warmRed },
        "b2s-petro-gray": { ...color.b2s.petroGray },
        icon: { ...iconography.color },
        // shadcn/ui semantic mappings → B2S CSS vars
        background: "var(--bg-body)",
        foreground: "var(--text-primary)",
        card: {
          DEFAULT: "var(--bg-card)",
          foreground: "var(--text-primary)",
        },
        popover: {
          DEFAULT: "var(--bg-card)",
          foreground: "var(--text-primary)",
        },
        primary: {
          DEFAULT: "var(--primary-default)",
          foreground: "#ffffff",
          hover: "var(--primary-hover)",
          accent: "var(--primary-accent)",
          subtle: "var(--primary-subtle)",
          surface: "var(--primary-surface)",
        },
        secondary: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-primary)",
        },
        muted: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-secondary)",
        },
        accent: {
          DEFAULT: "var(--primary-accent)",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "var(--danger-default)",
          foreground: "#ffffff",
          hover: "var(--danger-hover)",
          subtle: "var(--danger-subtle)",
          surface: "var(--danger-surface)",
        },
        success: {
          DEFAULT: "var(--success-default)",
          foreground: "#ffffff",
          hover: "var(--success-hover)",
          subtle: "var(--success-subtle)",
          surface: "var(--success-surface)",
        },
        warning: {
          DEFAULT: "var(--warning-default)",
          foreground: "#ffffff",
          hover: "var(--warning-hover)",
          subtle: "var(--warning-subtle)",
          surface: "var(--warning-surface)",
        },
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--primary-default)",
        sidebar: {
          DEFAULT: "var(--bg-sidebar)",
          foreground: "var(--text-primary)",
          primary: "var(--primary-default)",
          "primary-foreground": "#ffffff",
          accent: "var(--bg-hover)",
          "accent-foreground": "var(--text-primary)",
          border: "var(--border)",
          ring: "var(--primary-default)",
        },
        chart: {
          "1": "var(--b2s-color-blue-500)",
          "2": "var(--b2s-color-green-500)",
          "3": "var(--b2s-color-amber-500)",
          "4": "var(--b2s-color-red-500)",
          "5": "var(--b2s-color-blue-400)",
        },
      },
      borderRadius: {
        lg: radius.lg,
        md: radius.md,
        sm: radius.sm,
        xl: radius.xl,
      },
      width: {
        "icon-sm": iconography.size.sm,
        "icon-md": iconography.size.md,
        "icon-base": iconography.size.base,
        "icon-lg": iconography.size.lg,
        "icon-xl": iconography.size.xl,
        "icon-2xl": iconography.size["2xl"],
      },
      height: {
        "icon-sm": iconography.size.sm,
        "icon-md": iconography.size.md,
        "icon-base": iconography.size.base,
        "icon-lg": iconography.size.lg,
        "icon-xl": iconography.size.xl,
        "icon-2xl": iconography.size["2xl"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
