import { defineRecipe } from "@chakra-ui/react"

export const navRecipe = defineRecipe({
  base: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    bg: "bg.surface",
    borderBottomWidth: "1px",
    borderBottomColor: "border.default",
    px: { base: "4", md: "6" },
    py: "3",
    shadow: "sm",
  },
})

export const navItemRecipe = defineRecipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    px: "3",
    py: "2",
    fontSize: "sm",
    fontWeight: "500",
    color: "fg.default",
    borderRadius: "md",
    transition: "all 0.2s ease",
    _hover: {
      bg: "bg.subtle",
      color: "brand.primary",
    },
    _active: {
      bg: "bg.muted",
      color: "brand.accent",
    },
  },
})
