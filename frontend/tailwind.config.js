/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // MarineMarket Professional Color Palette (WCAG AA compliant)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0A6EE1', // Marine Blue - CTAs, accents
          700: '#0757B4', // Marine Blue Dark - hover/active
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        secondary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0FB5BA', // Sea Teal - finance tags, highlights
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        neutral: {
          50: '#F8FAFC', // Backgrounds
          100: '#f1f5f9',
          200: '#E5E7EB', // Borders
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#334155', // Body text
          800: '#1f2937',
          900: '#0F172A', // Ink - headings
          950: '#030712',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16A34A', // Success green
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          50: '#fefdf8',
          100: '#fefbf0',
          200: '#fef7e0',
          300: '#feefbb',
          400: '#fde68a',
          500: '#fcd34d',
          600: '#F59E0B', // Warning orange
          700: '#d97706',
          800: '#b45309',
          900: '#92400e',
          950: '#451a03',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#DC2626', // Error red
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Legacy colors for backward compatibility
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        navy: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        'gradient-water': 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
        'water-texture': 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.05) 0px, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.05) 0px, transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 350ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up': 'slideUp 250ms cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scaleIn 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'hover-lift': 'hoverLift 150ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        hoverLift: {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(-4px)' },
        }
      },
      boxShadow: {
        'ambient': '0 10px 30px rgba(2, 12, 27, 0.06)',
        'elevate': '0 16px 40px rgba(2, 12, 27, 0.10)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'primary': '0 4px 14px 0 rgba(10, 110, 225, 0.25)',
        'primary-hover': '0 6px 20px 0 rgba(10, 110, 225, 0.35)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'card': '14px',
        'input': '16px',
        'button': '9999px', // pill buttons
      },

    },
  },
  plugins: [],
}
