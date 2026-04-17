/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        cardForeground: 'hsl(var(--card-foreground))',
        border: 'hsl(var(--border))',
        muted: 'hsl(var(--muted))',
        mutedForeground: 'hsl(var(--muted-foreground))',
        primary: 'hsl(var(--primary))',
        primaryForeground: 'hsl(var(--primary-foreground))',
        danger: 'hsl(var(--danger))',
        dangerForeground: 'hsl(var(--danger-foreground))',
        success: 'hsl(var(--success))',
        successForeground: 'hsl(var(--success-foreground))'
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
        lg: '12px',
        md: '10px',
        sm: '8px'
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(0,0,0,.18)',
        ios: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
        'ios-lg': '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
        'ios-xl': '0 20px 60px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06)'
      }
    }
  },
  plugins: []
};

