import { defineRecipe } from "@chakra-ui/react"

export const inputRecipe = defineRecipe({
  base: {
    width: "100%",
    px: "3",
    py: "2",
    fontSize: "sm",
    borderRadius: "md",
    borderWidth: "1px",
    borderColor: "border.default",
    bg: "bg.surface",
    color: "fg.default",
    transition: "all 0.2s ease",
    _hover: {
      borderColor: "border.strong",
    },
    _focusVisible: {
      borderColor: "border.focus",
      outline: "none",
      shadow: "focus",
    },
    _disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    _placeholder: {
      color: "fg.subtle",
    },
  },
  variants: {
    size: {
      sm: {
        px: "2",
        py: "1",
        fontSize: "xs",
        h: "8",
      },
      md: {
        px: "3",
        py: "2",
        fontSize: "sm",
        h: "10",
      },
      lg: {
        px: "4",
        py: "3",
        fontSize: "md",
        h: "12",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})
