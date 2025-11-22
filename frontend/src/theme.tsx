import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"
import { badgeRecipe } from "./theme/badge.recipe.ts"
import { buttonRecipe } from "./theme/button.recipe.ts"
import { cardRecipe } from "./theme/card.recipe.ts"
import { inputRecipe } from "./theme/input.recipe.ts"
import { navItemRecipe, navRecipe } from "./theme/nav.recipe.ts"

const customConfig = defineConfig({
  globalCss: {
    html: {
      fontSize: "16px",
      scrollBehavior: "smooth",
    },
    body: {
      fontSize: "0.875rem",
      margin: 0,
      padding: 0,
      bg: "bg.canvas",
      color: "fg.default",
      lineHeight: "1.6",
    },
    "::selection": {
      bg: "brand.primary/20",
      color: "fg.default",
    },
    "*:focus-visible": {
      outline: "2px solid",
      outlineColor: "border.focus",
      outlineOffset: "2px",
    },
    ".main-link": {
      color: "brand.primary",
      fontWeight: "600",
      textDecoration: "none",
      transition: "color 0.2s ease",
      _hover: {
        color: "brand.accent",
      },
    },
  },
  theme: {
    tokens: {
      colors: {
        cyan: {
          50: { value: "#ecfeff" },
          100: { value: "#cffafe" },
          200: { value: "#a5f3fc" },
          300: { value: "#67e8f9" },
          400: { value: "#22d3ee" },
          500: { value: "#06b6d4" },
          600: { value: "#0891b2" },
          700: { value: "#0e7490" },
          800: { value: "#155e75" },
          900: { value: "#164e63" },
        },
        slate: {
          50: { value: "#f8fafc" },
          100: { value: "#f1f5f9" },
          200: { value: "#e2e8f0" },
          300: { value: "#cbd5e1" },
          400: { value: "#94a3b8" },
          500: { value: "#64748b" },
          600: { value: "#475569" },
          700: { value: "#334155" },
          800: { value: "#1e293b" },
          900: { value: "#0f172a" },
        },
        white: { value: "#ffffff" },
        black: { value: "#000000" },
      },
      spacing: {
        0: { value: "0" },
        px: { value: "1px" },
        0.5: { value: "0.125rem" },
        1: { value: "0.25rem" },
        1.5: { value: "0.375rem" },
        2: { value: "0.5rem" },
        2.5: { value: "0.625rem" },
        3: { value: "0.75rem" },
        3.5: { value: "0.875rem" },
        4: { value: "1rem" },
        5: { value: "1.25rem" },
        6: { value: "1.5rem" },
        7: { value: "1.75rem" },
        8: { value: "2rem" },
        10: { value: "2.5rem" },
        12: { value: "3rem" },
        16: { value: "4rem" },
        20: { value: "5rem" },
        24: { value: "6rem" },
        32: { value: "8rem" },
      },
      radii: {
        none: { value: "0" },
        xs: { value: "0.25rem" },
        sm: { value: "0.375rem" },
        md: { value: "0.5rem" },
        lg: { value: "0.75rem" },
        xl: { value: "1rem" },
        "2xl": { value: "1.25rem" },
        full: { value: "9999px" },
      },
      shadows: {
        xs: { value: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
        sm: {
          value:
            "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        },
        md: {
          value:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        },
        lg: {
          value:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
        },
        xl: {
          value:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        },
        "2xl": { value: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" },
        focus: { value: "0 0 0 3px rgba(8, 145, 178, 0.4)" },
      },
      durations: {
        fast: { value: "150ms" },
        normal: { value: "200ms" },
        slow: { value: "300ms" },
        slower: { value: "500ms" },
      },
      easings: {
        default: { value: "cubic-bezier(0.4, 0, 0.2, 1)" },
        in: { value: "cubic-bezier(0.4, 0, 1, 1)" },
        out: { value: "cubic-bezier(0, 0, 0.2, 1)" },
        inOut: { value: "cubic-bezier(0.4, 0, 0.2, 1)" },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          primary: {
            value: {
              _light: "{colors.cyan.600}",
              _dark: "{colors.cyan.400}",
            },
          },
          accent: {
            value: {
              _light: "{colors.cyan.700}",
              _dark: "{colors.cyan.300}",
            },
          },
          muted: {
            value: "{colors.cyan.500}",
          },
        },
        bg: {
          canvas: {
            value: {
              _light: "{colors.slate.50}",
              _dark: "{colors.slate.900}",
            },
          },
          surface: {
            value: {
              _light: "{colors.white}",
              _dark: "{colors.slate.800}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.slate.100}",
              _dark: "{colors.slate.700}",
            },
          },
          muted: {
            value: {
              _light: "{colors.slate.200}",
              _dark: "{colors.slate.600}",
            },
          },
          emphasis: {
            value: {
              _light: "{colors.slate.300}",
              _dark: "{colors.slate.500}",
            },
          },
        },
        fg: {
          default: {
            value: {
              _light: "{colors.slate.900}",
              _dark: "{colors.slate.100}",
            },
          },
          muted: {
            value: {
              _light: "{colors.slate.600}",
              _dark: "{colors.slate.300}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.slate.500}",
              _dark: "{colors.slate.400}",
            },
          },
          emphasis: {
            value: {
              _light: "{colors.slate.800}",
              _dark: "{colors.slate.200}",
            },
          },
          inverse: {
            value: {
              _light: "{colors.white}",
              _dark: "{colors.slate.900}",
            },
          },
        },
        border: {
          default: {
            value: {
              _light: "{colors.slate.200}",
              _dark: "{colors.slate.700}",
            },
          },
          strong: {
            value: {
              _light: "{colors.slate.300}",
              _dark: "{colors.slate.600}",
            },
          },
          focus: {
            value: {
              _light: "{colors.cyan.600}",
              _dark: "{colors.cyan.400}",
            },
          },
        },
        status: {
          pending: {
            value: {
              _light: "{colors.slate.500}",
              _dark: "{colors.slate.400}",
            },
          },
          confirmed: {
            value: {
              _light: "#3b82f6",
              _dark: "#60a5fa",
            },
          },
          preparing: {
            value: {
              _light: "#eab308",
              _dark: "#fbbf24",
            },
          },
          ready_to_ship: {
            value: {
              _light: "#f97316",
              _dark: "#fb923c",
            },
          },
          out_for_delivery: {
            value: {
              _light: "#14b8a6",
              _dark: "#2dd4bf",
            },
          },
          delivered: {
            value: {
              _light: "#10b981",
              _dark: "#34d399",
            },
          },
          cancelled: {
            value: {
              _light: "#ef4444",
              _dark: "#f87171",
            },
          },
          returned: {
            value: {
              _light: "#a855f7",
              _dark: "#c084fc",
            },
          },
          refunded: {
            value: {
              _light: "#ec4899",
              _dark: "#f472b6",
            },
          },
        },
        success: {
          solid: {
            value: {
              _light: "#10b981",
              _dark: "#34d399",
            },
          },
          muted: {
            value: {
              _light: "#d1fae5",
              _dark: "#064e3b",
            },
          },
        },
        warning: {
          solid: {
            value: {
              _light: "#f59e0b",
              _dark: "#fbbf24",
            },
          },
          muted: {
            value: {
              _light: "#fef3c7",
              _dark: "#78350f",
            },
          },
        },
        danger: {
          solid: {
            value: {
              _light: "#ef4444",
              _dark: "#f87171",
            },
          },
          muted: {
            value: {
              _light: "#fee2e2",
              _dark: "#7f1d1d",
            },
          },
        },
        info: {
          solid: {
            value: {
              _light: "#3b82f6",
              _dark: "#60a5fa",
            },
          },
          muted: {
            value: {
              _light: "#dbeafe",
              _dark: "#1e3a8a",
            },
          },
        },
      },
    },
    recipes: {
      button: buttonRecipe,
      card: cardRecipe,
      badge: badgeRecipe,
      input: inputRecipe,
      nav: navRecipe,
      navItem: navItemRecipe,
    },
  },
})

export const system = createSystem(defaultConfig, customConfig)
