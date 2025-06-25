/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		boxShadow: {
  			'3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.6)',
  			hero: '0 10px 40px rgba(6, 182, 212, 0.4)',
  			'card-hover': '0 15px 30px rgba(0,0,0,0.5)'
  		},
  		animation: {
  			'gradient-text': 'gradient-text 3s linear infinite',
  			'blob-slow': 'blob 12s infinite',
  			'blob-med': 'blob 9s infinite',
  			'blob-fast': 'blob 7s infinite',
  			'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'badge-pop': 'badge-pop 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
  		},
  		keyframes: {
  			'gradient-text': {
  				'0%, 100%': {
  					'background-size': '200% 200%',
  					'background-position': 'left center'
  				},
  				'50%': {
  					'background-size': '200% 200%',
  					'background-position': 'right center'
  				}
  			},
  			blob: {
  				'0%, 100%': {
  					transform: 'translate(0px, 0px) scale(1)'
  				},
  				'33%': {
  					transform: 'translate(30px, -50px) scale(1.1)'
  				},
  				'66%': {
  					transform: 'translate(-20px, 20px) scale(0.9)'
  				}
  			},
  			'badge-pop': {
  				'0%': {
  					transform: 'scale(0.5) opacity(0)'
  				},
  				'80%': {
  					transform: 'scale(1.1) opacity(1)'
  				},
  				'100%': {
  					transform: 'scale(1) opacity(1)'
  				}
  			}
  		},
  		colors: {
  			'gray-950': '#0F172A',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  // IMPORTANT: The 'plugins' property for Tailwind CSS should be an ARRAY, not an object.
  // If you have Tailwind CSS plugins (like @tailwindcss/forms), they go here:
  plugins: [require("tailwindcss-animate", "@tailwindcss/typography")], // <--- This must be an empty array if you have no Tailwind plugins, or an array of plugins
};