import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#E6C04A",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#000000",
          foreground: "#FFD700",
        },
        destructive: {
          DEFAULT: "#8B0000",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#000000",
          foreground: "#A0A0A0",
        },
        accent: {
          DEFAULT: "#F0D675",
          foreground: "#000000",
        },
        card: {
          DEFAULT: "#000000",
          foreground: "#FFFFFF",
        },
        gold: {
          DEFAULT: "#E6C04A",
          light: "#F0D675",
          dark: "#D4AF37",
          metallic: "#E8C85A",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        serif: ['"Playfair Display"', "serif"],
        sans: ["Inter", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "gold-pulse": {
          "0%, 100%": { 
            boxShadow: "0 0 0 0 rgba(230, 192, 74, 0.6)",
            filter: "brightness(1) saturate(1.1)"
          },
          "50%": { 
            boxShadow: "0 0 20px 10px rgba(230, 192, 74, 0.4)",
            filter: "brightness(1.08) saturate(1.2)"
          },
        },
        "gold-shimmer": {
          "0%, 100%": { 
            backgroundPosition: "0% 50%",
            filter: "brightness(1) saturate(1.2)"
          },
          "50%": { 
            backgroundPosition: "100% 50%",
            filter: "brightness(1.2) saturate(1.4)"
          },
        },
        "flip": {
          "0%": { 
            transform: "rotateY(0deg)",
          },
          "50%": { 
            transform: "rotateY(180deg)",
          },
          "100%": { 
            transform: "rotateY(360deg)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gold-pulse": "gold-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gold-shimmer": "gold-shimmer 3s ease-in-out infinite",
        "flip": "flip 1.5s ease-in-out infinite",
      },
      boxShadow: {
        "gold": "0 0 8px rgba(230, 192, 74, 0.3), 0 0 16px rgba(230, 192, 74, 0.15)",
        "gold-lg": "0 0 16px rgba(230, 192, 74, 0.4), 0 0 32px rgba(230, 192, 74, 0.2)",
        "depth": "0 4px 16px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        "depth-lg": "0 8px 32px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      },
      perspective: {
        "1000": "1000px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

