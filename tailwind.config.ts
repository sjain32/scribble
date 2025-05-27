// Located in: tailwind.config.ts
import type { Config } from "tailwindcss"

const config = {
  darkMode: "class", // Enables dark mode based on a class (usually on <html> or <body>)
  content: [
    './pages/**/*.{ts,tsx}', // Default paths might vary
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}', // Include this if you use the src directory
	],
  prefix: "", // You might have set a prefix, but default is often empty
  theme: {
    container: { // Example: ShadCN might configure the container class
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: { // <-- Most ShadCN additions happen here
      colors: {
        // Maps Tailwind color names to the CSS variables defined in globals.css
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        // Maps Tailwind border radius sizes to the CSS variable
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: { // Adds keyframes used by ShadCN components (e.g., for animations)
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // potentially more keyframes...
      },
      animation: { // Defines utility classes for the keyframes
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // potentially more animations...
      },
    },
  },
  plugins: [require("tailwindcss-animate")], // Adds Tailwind plugin for animations
} satisfies Config

export default config