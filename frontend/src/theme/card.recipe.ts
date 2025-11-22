import { defineRecipe } from "@chakra-ui/react"

export const cardRecipe = defineRecipe({
  base: {
    bg: "bg.surface",
    borderRadius: "lg",
    borderWidth: "1px",
    borderColor: "border.default",
    overflow: "hidden",
    transition: "all 0.2s ease",
  },
  variants: {
    variant: {
      outline: {
        shadow: "none",
        _hover: {
          borderColor: "border.strong",
        },
      },
      elevated: {
        shadow: "sm",
        borderWidth: "0",
        _hover: {
          shadow: "md",
        },
      },
      subtle: {
        bg: "bg.subtle",
        borderWidth: "0",
      },
    },
    size: {
      sm: {
        p: "3",
      },
      md: {
        p: "4",
      },
      lg: {
        p: "6",
      },
    },
  },
  defaultVariants: {
    variant: "outline",
    size: "md",
  },
})
