/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Базовые слои приложения (динамические токены с CSS переменными)
        canvas: 'var(--bg-canvas, #090b10)',
        surface: 'var(--bg-surface, rgba(18, 22, 30, 0.78))',
        card: 'var(--bg-card, rgba(24, 29, 40, 0.65))',
        'card-hover': 'var(--bg-card-hover, rgba(33, 40, 56, 0.85))',
        'active-row': 'var(--bg-card-active, rgba(41, 50, 70, 0.95))',
        
        // Алиасы совместимости
        'bg-primary': 'var(--bg-canvas, #090b10)',
        'bg-surface': 'var(--bg-surface, rgba(18, 22, 30, 0.78))',
        'bg-card': 'var(--bg-card, rgba(24, 29, 40, 0.65))',
        'border-subtle': 'var(--glass-border, rgba(255, 255, 255, 0.08))',
        'border-glass': 'var(--glass-border, rgba(255, 255, 255, 0.08))',
        'glass-border': 'var(--glass-border, rgba(255, 255, 255, 0.08))',

        // Акцент активной темы
        accent: {
          DEFAULT: 'var(--accent, #f5b920)',
          hover: 'var(--accent-hover, #fac742)',
          active: 'var(--accent-active, #e0a312)',
          subtle: 'var(--accent-subtle, rgba(245, 185, 32, 0.12))',
          text: 'var(--accent-text, #0c0d12)',
        },

        // Семантические цвета (Инвариантные!)
        semantic: {
          damage: 'var(--semantic-damage, #e5484d)',
          heal: 'var(--semantic-heal, #3dd68c)',
          save: 'var(--semantic-save, #4f9cf9)',
          magic: 'var(--semantic-magic, #8b5cf6)',
        },

        // Функциональные и семантические цвета
        gold: {
          DEFAULT: 'var(--accent, #f5b920)',
          light: 'var(--text-gold-light, #fce79f)',
          hover: 'var(--accent-hover, #fac742)',
          dark: 'var(--accent-active, #d99b0c)',
          glow: 'var(--accent-glow, rgba(245, 185, 32, 0.28))',
        },
        crimson: {
          DEFAULT: '#e5484d',
          bright: '#f87171',
          dark: '#c5282d',
          boss: '#b91c1c',
          ddb: '#dc2626',
        },
        emerald: {
          DEFAULT: '#3dd68c',
          light: '#34d399',
          dark: '#23a066',
        },
        sapphire: {
          DEFAULT: '#4f9cf9',
          light: '#60a5fa',
          dark: '#2b7ce5',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
        },
        amber: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        ddb: {
          red: '#dc2626',
          'red-bright': '#ef4444',
          'red-dark': '#991b1b',
          'red-banner': '#7f1d1d',
          gold: '#f5b920',
          'gold-bright': '#fac742',
          parchment: '#f9fafb',
          'parchment-dark': '#111827',
          slate: {
            900: '#090b10',
            800: '#11151e',
            700: '#181f2c',
            600: '#232c3d',
            500: '#344158',
          },
        },
      },
      borderRadius: {
        'glass-sm': 'var(--radius-sm, 10px)',
        'glass': 'var(--radius-md, 14px)',
        'glass-lg': 'var(--radius-lg, 16px)',
        'glass-xl': 'var(--radius-xl, 20px)',
        'glass-2xl': 'var(--radius-2xl, 24px)',
        'card': 'var(--radius-card, 16px)',
        'pill': 'var(--radius-pill, 9999px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', '"JetBrains Mono"', 'Consolas', 'monospace'],
        heading: ['var(--font-heading)', 'Manrope', 'sans-serif'],
        serif: ['Inter', 'system-ui', 'sans-serif'],
        'body-serif': ['Inter', 'system-ui', 'sans-serif'],
        'ddb-serif': ['Inter', 'system-ui', 'sans-serif'],
        'ddb-body': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': 'var(--accent-glow, 0 0 20px rgba(245, 185, 32, 0.32))',
        'crimson-glow': 'var(--semantic-damage-glow, 0 0 20px rgba(229, 72, 77, 0.35))',
        'emerald-glow': 'var(--semantic-heal-glow, 0 0 20px rgba(61, 214, 140, 0.35))',
        'glass': 'var(--glass-shadow, 0 12px 32px -4px rgba(0, 0, 0, 0.65))',
        'glass-panel': 'var(--glass-shadow, 0 12px 32px -4px rgba(0, 0, 0, 0.65))',
      },
      borderOpacity: {
        subtle: '0.08',
      },
    },
  },
  plugins: [],
}
