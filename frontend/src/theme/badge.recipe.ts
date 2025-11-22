import { defineRecipe } from "@chakra-ui/react"

export const badgeRecipe = defineRecipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    px: "2",
    py: "0.5",
    fontSize: "xs",
    fontWeight: "600",
    lineHeight: "1",
    borderRadius: "md",
    whiteSpace: "nowrap",
  },
  variants: {
    variant: {
      solid: {
        bg: "brand.primary",
        color: "fg.inverse",
      },
      subtle: {
        bg: "bg.muted",
        color: "fg.emphasis",
      },
      outline: {
        borderWidth: "1px",
        borderColor: "border.default",
        color: "fg.default",
        bg: "transparent",
      },
    },
    colorPalette: {
      cyan: {},
      green: {},
      red: {},
      orange: {},
      blue: {},
      gray: {},
      yellow: {},
      teal: {},
      purple: {},
      pink: {},
    },
  },
  defaultVariants: {
    variant: "subtle",
  },
})
