/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          raised: 'var(--bg-raised)',
          sunken: 'var(--bg-sunken)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          medium: 'var(--border-medium)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          disabled: 'var(--text-disabled)',
        },
        brand: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
          mid: 'var(--accent-mid)',
        },
        severity: {
          critical: { DEFAULT: 'var(--critical)', bg: 'var(--critical-bg)', border: 'var(--critical-border)' },
          high: { DEFAULT: 'var(--high)', bg: 'var(--high-bg)', border: 'var(--high-border)' },
          medium: { DEFAULT: 'var(--medium)', bg: 'var(--medium-bg)', border: 'var(--medium-border)' },
          low: { DEFAULT: 'var(--low)', bg: 'var(--low-bg)', border: 'var(--low-border)' },
          info: { DEFAULT: 'var(--info)', bg: 'var(--info-bg)', border: 'var(--info-border)' },
        },
        agent: {
          sentinel: 'var(--agent-sentinel)',
          oracle: 'var(--agent-oracle)',
          striker: 'var(--agent-striker)',
          nexus: 'var(--agent-nexus)',
          herald: 'var(--agent-herald)',
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      borderRadius: {
        'xs': 'var(--r-xs)',
        'sm': 'var(--r-sm)',
        'md': 'var(--r-md)',
        'lg': 'var(--r-lg)',
        'xl': 'var(--r-xl)',
        'full': 'var(--r-full)',
      }
    },
  },
  plugins: [],
}
