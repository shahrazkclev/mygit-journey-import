import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: 'clamp(1rem, 2vw, 1.5rem)',
				sm: 'clamp(1rem, 2vw, 1.5rem)',
				lg: 'clamp(1.5rem, 3vw, 2rem)',
				xl: 'clamp(1.5rem, 3vw, 2rem)',
				'2xl': 'clamp(2rem, 4vw, 2.5rem)'
			},
			screens: {
				sm: '640px',
				md: '768px',
				lg: '1024px',
				xl: '1280px',
				'2xl': '1536px'
			}
		},
		extend: {
			fontSize: {
				'fluid-xs': 'clamp(0.75rem, 1.5vw, 0.875rem)',
				'fluid-sm': 'clamp(0.875rem, 2vw, 1rem)',
				'fluid-base': 'clamp(0.875rem, 2vw, 1rem)',
				'fluid-lg': 'clamp(1rem, 2.5vw, 1.125rem)',
				'fluid-xl': 'clamp(1.125rem, 3vw, 1.25rem)',
				'fluid-2xl': 'clamp(1.25rem, 3.5vw, 1.5rem)',
				'fluid-3xl': 'clamp(1.5rem, 4vw, 1.875rem)',
				'fluid-4xl': 'clamp(1.875rem, 5vw, 2.25rem)',
				'fluid-5xl': 'clamp(2.25rem, 6vw, 3rem)',
			},
			spacing: {
				'fluid-xs': 'clamp(0.25rem, 0.5vw, 0.5rem)',
				'fluid-sm': 'clamp(0.5rem, 1vw, 0.75rem)',
				'fluid-md': 'clamp(0.75rem, 1.5vw, 1rem)',
				'fluid-lg': 'clamp(1rem, 2vw, 1.5rem)',
				'fluid-xl': 'clamp(1.5rem, 3vw, 2rem)',
				'fluid-2xl': 'clamp(2rem, 4vw, 3rem)',
			},
			screens: {
				'xs': '320px',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				email: {
					primary: 'hsl(var(--email-primary))',
					secondary: 'hsl(var(--email-secondary))',
					accent: 'hsl(var(--email-accent))',
					success: 'hsl(var(--email-success))',
					warning: 'hsl(var(--email-warning))',
					background: 'hsl(var(--email-background))',
					muted: 'hsl(var(--email-muted))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'fluid': 'clamp(0.375rem, 0.5vw, 1rem)',
			},
			backgroundImage: {
				'gradient-soft': 'var(--gradient-soft)',
				'gradient-card': 'var(--gradient-card)',
			},
			boxShadow: {
				'sm': 'var(--shadow-sm)',
				'md': 'var(--shadow-md)',
				'fluid-sm': '0 clamp(1px, 0.2vw, 2px) clamp(2px, 0.4vw, 4px) 0 hsl(var(--theme-text-primary) / 0.05)',
				'fluid-md': '0 clamp(2px, 0.4vw, 4px) clamp(4px, 0.8vw, 6px) -1px hsl(var(--theme-text-primary) / 0.1), 0 clamp(1px, 0.2vw, 2px) clamp(2px, 0.4vw, 4px) -1px hsl(var(--theme-text-primary) / 0.06)',
				'fluid-lg': '0 clamp(4px, 0.8vw, 10px) clamp(6px, 1.2vw, 15px) -2px hsl(var(--theme-text-primary) / 0.1), 0 clamp(2px, 0.4vw, 4px) clamp(4px, 0.8vw, 6px) -2px hsl(var(--theme-text-primary) / 0.06)',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'pulse-soft': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.7' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(8px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				'shimmer': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'float': 'float 6s ease-in-out infinite',
				'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
				'fade-in': 'fade-in 0.4s ease-out',
				'scale-in': 'scale-in 0.3s ease-out',
				'shimmer': 'shimmer 2s infinite'
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
