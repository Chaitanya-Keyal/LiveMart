import { Box, Button, HStack, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { FiLogOut, FiUser } from "react-icons/fi"

import type { RoleEnum } from "@/client"
import useAuth from "@/hooks/useAuth"
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu"

const roleLabels: Record<RoleEnum, string> = {
  admin: "Admin",
  customer: "Customer",
  retailer: "Retailer",
  wholesaler: "Wholesaler",
  delivery_partner: "Delivery Partner",
}

const roleIcons: Record<RoleEnum, string> = {
  admin: "⚙️",
  customer: "🛒",
  retailer: "🏪",
  wholesaler: "📦",
  delivery_partner: "🚚",
}

const UserMenu = () => {
  const { logout, activeRole, availableRoles, switchRoleMutation } = useAuth()

  const handleLogout = async () => {
    logout()
  }

  const handleSwitchRole = async (role: RoleEnum) => {
    try {
      await switchRoleMutation.mutateAsync(role)
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <Button
          data-testid="user-menu"
          variant="outline"
          size="md"
          px={4}
          py={2}
          borderRadius="md"
          _hover={{
            bg: "bg.muted",
            borderColor: "brand.primary",
          }}
          transition="all 0.2s"
        >
          <HStack gap={2}>
            {activeRole && (
              <>
                <span style={{ fontSize: "1rem" }}>
                  {roleIcons[activeRole]}
                </span>
                <Text
                  fontSize="sm"
                  fontWeight="600"
                  display={{ base: "none", sm: "block" }}
                >
                  {roleLabels[activeRole]}
                </Text>
              </>
            )}
            {!activeRole && (
              <>
                <FiUser size={18} />
                <Text
                  fontSize="sm"
                  fontWeight="600"
                  display={{ base: "none", sm: "block" }}
                >
                  Menu
                </Text>
              </>
            )}
          </HStack>
        </Button>
      </MenuTrigger>

      <MenuContent>
        {/* Switch Role */}
        {availableRoles.length > 1 && (
          <>
            <Box px={3} py={2} bg="bg.subtle">
              <Text
                fontSize="xs"
                color="fg.emphasis"
                fontWeight="700"
                letterSpacing="wide"
              >
                SWITCH ROLE
              </Text>
            </Box>
            {availableRoles
              .filter((role) => role !== activeRole)
              .map((role) => (
                <MenuItem
                  key={role}
                  value={`switch-${role}`}
                  gap={2}
                  py={2.5}
                  onClick={() => handleSwitchRole(role)}
                  style={{ cursor: "pointer" }}
                  disabled={switchRoleMutation.isPending}
                >
                  <span style={{ fontSize: "1.1rem" }}>{roleIcons[role]}</span>
                  <Box flex="1">
                    <Text fontWeight="500">{roleLabels[role]}</Text>
                  </Box>
                </MenuItem>
              ))}
            <MenuSeparator />
          </>
        )}

        <Link to="/settings">
          <MenuItem
            closeOnSelect
            value="user-settings"
            gap={2}
            py={2}
            style={{ cursor: "pointer" }}
          >
            <FiUser fontSize="18px" />
            <Box flex="1">My Profile</Box>
          </MenuItem>
        </Link>

        <MenuItem
          value="logout"
          gap={2}
          py={2}
          onClick={handleLogout}
          style={{ cursor: "pointer" }}
        >
          <FiLogOut />
          Log Out
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  )
}

export default UserMenu
