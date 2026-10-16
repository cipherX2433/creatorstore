/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
      './pages/**/*.{js,jsx}',
      './components/**/*.{js,jsx}',
      './app/**/*.{js,jsx}',
      './src/**/*.{js,jsx}',
    ],
    prefix: "",
    theme: {
      container: {
        center: true,
        padding: '2rem',
        screens: {
          '2xl': '1400px'
        }
      },
    extend: {
      /* ====================================================================
         DESIGN TOKENS — Phase 1
         Values live in `app/tokens.css`; this block only exposes them as
         utilities. New namespaces throughout (`brand`, `surface`, `content`,
         `edge`, semantic radius/shadow/spacing keys) so that no existing
         utility is redefined and no component changes appearance.
         See `docs/design-tokens.md` for usage and the Phase 2 backlog.
         ==================================================================== */
      fontFamily: {
        sans: ['var(--font-manrope)', 'var(--font-sans)', 'Manrope', 'system-ui', 'sans-serif'],
        brand: ['var(--font-brand)', 'var(--font-manrope)', 'Plus Jakarta Sans', 'Manrope', 'system-ui', 'sans-serif'],
        wordmark: ['var(--font-brand)', 'var(--font-manrope)', 'Plus Jakarta Sans', 'Manrope', 'system-ui', 'sans-serif'],
        orbitron: ['var(--font-orbitron)', 'Orbitron', 'system-ui', 'sans-serif'],
      },
      /* Each role bundles size + line-height + tracking + weight, so one
         class fully expresses one role: `<h1 className="text-page-title">`. */
      fontSize: {
        display: ['var(--text-display)', {
          lineHeight: 'var(--text-display-leading)',
          letterSpacing: 'var(--text-display-tracking)',
          fontWeight: 'var(--text-display-weight)',
        }],
        'page-title': ['var(--text-page-title)', {
          lineHeight: 'var(--text-page-title-leading)',
          letterSpacing: 'var(--text-page-title-tracking)',
          fontWeight: 'var(--text-page-title-weight)',
        }],
        section: ['var(--text-section)', {
          lineHeight: 'var(--text-section-leading)',
          letterSpacing: 'var(--text-section-tracking)',
          fontWeight: 'var(--text-section-weight)',
        }],
        'card-title': ['var(--text-card-title)', {
          lineHeight: 'var(--text-card-title-leading)',
          letterSpacing: 'var(--text-card-title-tracking)',
          fontWeight: 'var(--text-card-title-weight)',
        }],
        body: ['var(--text-body)', {
          lineHeight: 'var(--text-body-leading)',
          letterSpacing: 'var(--text-body-tracking)',
          fontWeight: 'var(--text-body-weight)',
        }],
        label: ['var(--text-label)', {
          lineHeight: 'var(--text-label-leading)',
          letterSpacing: 'var(--text-label-tracking)',
          fontWeight: 'var(--text-label-weight)',
        }],
        meta: ['var(--text-meta)', {
          lineHeight: 'var(--text-meta-leading)',
          letterSpacing: 'var(--text-meta-tracking)',
          fontWeight: 'var(--text-meta-weight)',
        }],
        micro: ['var(--text-micro)', {
          lineHeight: 'var(--text-micro-leading)',
          letterSpacing: 'var(--text-micro-tracking)',
          fontWeight: 'var(--text-micro-weight)',
        }],
      },
      /* Semantic layout spacing. The numeric 8px grid (1/2/3/4/6/8/12/16) is
         already Tailwind's default and is unchanged — these are the named
         recurring measurements, not aliases of the numeric steps. */
      spacing: {
        gutter: 'var(--layout-gutter)',
        'gutter-lg': 'var(--layout-gutter-lg)',
        card: 'var(--layout-card-padding)',
        'card-lg': 'var(--layout-card-padding-lg)',
        section: 'var(--layout-section-gap)',
        stack: 'var(--layout-stack-gap)',
        field: 'var(--layout-field-gap)',
        inline: 'var(--layout-inline-gap)',
      },
      maxWidth: {
        narrow: 'var(--layout-max-narrow)',
        content: 'var(--layout-max-content)',
        wide: 'var(--layout-max-wide)',
      },
      boxShadow: {
        raised: 'var(--shadow-raised)',
        card: 'var(--shadow-card)',
        dropdown: 'var(--shadow-dropdown)',
        modal: 'var(--shadow-modal)',
        focus: 'var(--shadow-focus)',
        brand: 'var(--shadow-brand)',
      },
      colors: {
        /* --- token namespaces (Phase 1) --- */
        brand: {
          DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
          hover: 'hsl(var(--color-primary-hover) / <alpha-value>)',
          active: 'hsl(var(--color-primary-active) / <alpha-value>)',
          soft: 'hsl(var(--color-primary-soft) / <alpha-value>)',
          fg: 'hsl(var(--color-primary-fg) / <alpha-value>)',
          yellow: 'hsl(var(--color-secondary) / <alpha-value>)',
          flare: 'hsl(var(--color-flare) / <alpha-value>)',
        },
        surface: {
          base: 'hsl(var(--color-surface-base) / <alpha-value>)',
          raised: 'hsl(var(--color-surface-raised) / <alpha-value>)',
          card: 'hsl(var(--color-surface-card) / <alpha-value>)',
          overlay: 'hsl(var(--color-surface-overlay) / <alpha-value>)',
          hover: 'hsl(var(--color-surface-hover) / <alpha-value>)',
        },
        content: {
          primary: 'hsl(var(--color-text-primary) / <alpha-value>)',
          secondary: 'hsl(var(--color-text-secondary) / <alpha-value>)',
          muted: 'hsl(var(--color-text-muted) / <alpha-value>)',
          subtle: 'hsl(var(--color-text-subtle) / <alpha-value>)',
          disabled: 'hsl(var(--color-text-disabled) / <alpha-value>)',
        },
        edge: {
          DEFAULT: 'hsl(var(--color-border) / <alpha-value>)',
          subtle: 'hsl(var(--color-border-subtle) / <alpha-value>)',
          strong: 'hsl(var(--color-border-strong) / <alpha-value>)',
          focus: 'hsl(var(--color-border-focus) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--color-success) / <alpha-value>)',
          fg: 'hsl(var(--color-success-fg) / <alpha-value>)',
          subtle: 'hsl(var(--color-success-subtle))',
        },
        warning: {
          DEFAULT: 'hsl(var(--color-warning) / <alpha-value>)',
          fg: 'hsl(var(--color-warning-fg) / <alpha-value>)',
          subtle: 'hsl(var(--color-warning-subtle))',
        },
        error: {
          DEFAULT: 'hsl(var(--color-error) / <alpha-value>)',
          fg: 'hsl(var(--color-error-fg) / <alpha-value>)',
          subtle: 'hsl(var(--color-error-subtle))',
        },
        info: {
          DEFAULT: 'hsl(var(--color-info) / <alpha-value>)',
          fg: 'hsl(var(--color-info-fg) / <alpha-value>)',
          subtle: 'hsl(var(--color-info-subtle))',
        },
        disabled: {
          DEFAULT: 'hsl(var(--color-disabled-surface) / <alpha-value>)',
          border: 'hsl(var(--color-disabled-border) / <alpha-value>)',
          fg: 'hsl(var(--color-disabled-text) / <alpha-value>)',
        },

        primary: {
          DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
          hover: 'hsl(var(--color-primary-hover) / <alpha-value>)',
          active: 'hsl(var(--color-primary-active) / <alpha-value>)',
          foreground: 'hsl(var(--color-primary-fg) / <alpha-value>)',
          subtle: 'var(--color-primary-subtle)',
          muted: 'var(--color-primary-muted)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--color-secondary) / <alpha-value>)',
          hover: 'hsl(var(--color-secondary-hover) / <alpha-value>)',
          active: 'hsl(var(--color-secondary-active) / <alpha-value>)',
          foreground: 'hsl(var(--color-secondary-fg) / <alpha-value>)',
          subtle: 'var(--color-secondary-subtle)',
        },
        accent: {
          DEFAULT: 'hsl(var(--color-accent) / <alpha-value>)',
          hover: 'hsl(var(--color-accent-hover) / <alpha-value>)',
          foreground: 'hsl(var(--color-accent-fg) / <alpha-value>)',
          subtle: 'var(--color-accent-subtle)',
        },
        surface: {
          DEFAULT: 'hsl(var(--color-surface-raised) / <alpha-value>)',
          base: 'hsl(var(--color-surface-base) / <alpha-value>)',
          raised: 'hsl(var(--color-surface-raised) / <alpha-value>)',
          card: 'hsl(var(--color-surface-card) / <alpha-value>)',
          overlay: 'hsl(var(--color-surface-overlay) / <alpha-value>)',
          hover: 'hsl(var(--color-surface-hover) / <alpha-value>)',
          elevated: 'hsl(var(--color-surface-hover) / <alpha-value>)',
        },
        page: 'hsl(var(--color-surface-base) / <alpha-value>)',
        danger: {
          DEFAULT: 'hsl(var(--color-error) / <alpha-value>)',
          fg: 'hsl(var(--color-error-fg) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'hsl(var(--color-border) / <alpha-value>)',
          subtle: 'hsl(var(--color-border-subtle) / <alpha-value>)',
          strong: 'hsl(var(--color-border-strong) / <alpha-value>)',
          focus: 'hsl(var(--color-border-focus) / <alpha-value>)',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
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
          /* Role-named token scale (Phase 1). Named by role rather than
             t-shirt size specifically so it cannot redefine the existing
             sm/md/lg utilities below, which are still wired to --radius. */
          chip: 'var(--radius-chip)',
          control: 'var(--radius-control)',
          pill: 'var(--radius-pill)',
          card: 'var(--radius-card)',
          modal: 'var(--radius-modal)',
          sheet: 'var(--radius-sheet)',

          /* Pre-existing shadcn mappings (unchanged) */
          lg: 'var(--radius)',
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)'
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
          }
        },
        animation: {
          'accordion-down': 'accordion-down 0.2s ease-out',
          'accordion-up': 'accordion-up 0.2s ease-out'
        }
      }
    },
    plugins: [require("tailwindcss-animate")],
  }