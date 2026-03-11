/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  prefix: "",
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
        
        // Premium dark palette
        obsidian: "#030306",
        void: "#08090E",
        abyss: "#0D1017",
        slate: "#141820",
        surface: "#1A1F2E",
        
        // Gold spectrum
        gold: {
          50: "#FDF8E8",
          100: "#F9EECC",
          200: "#F3DD99",
          300: "#EDCC66",
          400: "#E7BB33",
          DEFAULT: "#D4AF37",
          500: "#D4AF37",
          600: "#B8942C",
          700: "#8A6F21",
          800: "#5C4A16",
          900: "#2E250B",
        },
        
        // Accent colors
        emerald: {
          DEFAULT: "#10B981",
          light: "#34D399",
          dark: "#059669",
        },
        sapphire: {
          DEFAULT: "#3B82F6",
          light: "#60A5FA",
          dark: "#2563EB",
        },
        amethyst: {
          DEFAULT: "#8B5CF6",
          light: "#A78BFA",
          dark: "#7C3AED",
        },
        rose: {
          DEFAULT: "#F43F5E",
          light: "#FB7185",
          dark: "#E11D48",
        },
        amber: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
          dark: "#D97706",
        },
        
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
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'display-sm': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'premium': '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 10px 20px -5px rgba(0, 0, 0, 0.3)',
        'elevated': '0 50px 100px -20px rgba(0, 0, 0, 0.6), 0 30px 60px -10px rgba(0, 0, 0, 0.4)',
        'glow-gold': '0 0 40px rgba(212, 175, 55, 0.15), 0 0 80px rgba(212, 175, 55, 0.08)',
        'glow-emerald': '0 0 40px rgba(16, 185, 129, 0.2)',
        'glow-rose': '0 0 40px rgba(244, 63, 94, 0.2)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #E7BB33 50%, #B8942C 100%)',
        'gradient-premium': 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
        'mesh-gradient': 'radial-gradient(at 40% 20%, rgba(212, 175, 55, 0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(16, 185, 129, 0.08) 0px, transparent 50%)',
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
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(212, 175, 55, 0.4)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-in": "slide-in 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
