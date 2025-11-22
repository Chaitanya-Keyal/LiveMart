import { defineRecipe } from "@chakra-ui/react"

export const buttonRecipe = defineRecipe({
  base: {
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    borderRadius: "md",
    transition: "all 0.2s ease",
    cursor: "pointer",
    _disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focus",
      outlineOffset: "2px",
    },
  },
  variants: {
    variant: {
      solid: {
        bg: "brand.primary",
        color: "fg.inverse",
        _hover: {
          bg: "brand.accent",
          transform: "translateY(-1px)",
          shadow: "md",
        },
        _active: {
          transform: "translateY(0)",
          shadow: "sm",
        },
      },
      outline: {
        borderWidth: "1px",
        borderColor: "border.default",
        color: "fg.default",
        bg: "transparent",
        _hover: {
          bg: "bg.subtle",
          borderColor: "border.strong",
        },
      },
      ghost: {
        bg: "transparent",
        color: "fg.default",
        _hover: {
          bg: "bg.subtle",
        },
      },
      link: {
        bg: "transparent",
        color: "brand.primary",
        textDecoration: "underline",
        _hover: {
          color: "brand.accent",
        },
      },
    },
    size: {
      xs: {
        px: "2",
        py: "1",
        fontSize: "xs",
        h: "6",
      },
      sm: {
        px: "3",
        py: "1.5",
        fontSize: "sm",
        h: "8",
      },
      md: {
        px: "4",
        py: "2",
        fontSize: "sm",
        h: "10",
      },
      lg: {
        px: "6",
        py: "3",
        fontSize: "md",
        h: "12",
      },
    },
  },
  defaultVariants: {
    variant: "solid",
    size: "md",
  },
})
