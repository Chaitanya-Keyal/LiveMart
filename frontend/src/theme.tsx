import { createSystem, defaultConfig } from "@chakra-ui/react"
import { buttonRecipe } from "./theme/button.recipe"

export const system = createSystem(defaultConfig, {
  globalCss: {
    html: {
      fontSize: "16px",
    },
    body: {
      fontSize: "0.875rem",
      margin: 0,
      padding: 0,
    },
    ".main-link": {
      color: "ui.main",
      fontWeight: "bold",
    },
  },
  theme: {
    tokens: {
      colors: {
        ui: {
          main: { value: "#009688" },
        },
        status: {
          pending: { value: "gray.500" },
          confirmed: { value: "blue.500" },
          preparing: { value: "yellow.500" },
          ready_to_ship: { value: "orange.500" },
          out_for_delivery: { value: "teal.500" },
          delivered: { value: "green.500" },
          cancelled: { value: "red.500" },
          returned: { value: "purple.500" },
          refunded: { value: "pink.500" },
        },
      },
    },
    recipes: {
      button: buttonRecipe,
    },
  },
})
