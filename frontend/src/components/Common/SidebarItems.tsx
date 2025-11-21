import { Box, Flex, Icon, Text } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"
import {
  FiBriefcase,
  FiHome,
  FiPackage,
  FiSettings,
  FiShoppingBag,
  FiShoppingCart,
  FiTruck,
  FiUsers,
} from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { RoleEnum, UserPublic } from "@/client"

const baseItems = [
  { icon: FiHome, title: "Dashboard", path: "/" },
  { icon: FiSettings, title: "User Settings", path: "/settings" },
]

const roleItems: Record<
  RoleEnum,
  { icon: IconType; title: string; path: string }[]
> = {
  admin: [{ icon: FiUsers, title: "Admin Panel", path: "/admin" }],
  customer: [
    { icon: FiShoppingCart, title: "Browse Products", path: "/buy" },
    { icon: FiBriefcase, title: "My Orders", path: "/orders/me" },
  ],
  retailer: [
    { icon: FiShoppingCart, title: "Buy", path: "/buy" },
    { icon: FiShoppingBag, title: "Sell", path: "/sell" },
    { icon: FiBriefcase, title: "Orders", path: "/orders/me" },
  ],
  wholesaler: [
    { icon: FiPackage, title: "Sell", path: "/sell" },
    { icon: FiBriefcase, title: "Retailer Orders", path: "/orders/me" },
  ],
  delivery_partner: [
    { icon: FiTruck, title: "Look for Orders", path: "/delivery/available" },
    { icon: FiBriefcase, title: "My Deliveries", path: "/delivery/mine" },
  ],
}

interface SidebarItemsProps {
  onClose?: () => void
}

interface Item {
  icon: IconType
  title: string
  path: string
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])

  const activeRole = currentUser?.active_role
  const roleSpecificItems = activeRole ? roleItems[activeRole] : []

  const finalItems: Item[] = [
    ...baseItems.slice(0, 1),
    ...roleSpecificItems,
    ...baseItems.slice(1),
  ]

  const listItems = finalItems.map(({ icon, title, path }) => (
    <RouterLink key={title} to={path} onClick={onClose}>
      <Flex
        gap={4}
        px={4}
        py={2}
        _hover={{
          background: "gray.subtle",
        }}
        alignItems="center"
        fontSize="sm"
      >
        <Icon as={icon} alignSelf="center" />
        <Text ml={2}>{title}</Text>
      </Flex>
    </RouterLink>
  ))

  return (
    <>
      <Text fontSize="xs" px={4} py={2} fontWeight="bold">
        Menu
      </Text>
      <Box>{listItems}</Box>
    </>
  )
}

export default SidebarItems
