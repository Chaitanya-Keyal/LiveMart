import { Box, Button, Flex, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { FiLogOut, FiRefreshCw, FiUser } from "react-icons/fi"

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

const UserMenu = () => {
  const { user, logout, activeRole, availableRoles, switchRoleMutation } =
    useAuth()

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
    <Flex>
      <MenuRoot>
        <MenuTrigger asChild p={2}>
          <Button data-testid="user-menu" variant="solid" maxW="sm" truncate>
            <Flex direction="column" align="flex-start" lineHeight="1.1">
              <Text fontSize="sm" fontWeight="semibold">
                {user?.full_name || "User"}
              </Text>
              {activeRole && (
                <Text fontSize="xs" color="gray.600" fontWeight="medium">
                  {roleLabels[activeRole]}
                </Text>
              )}
            </Flex>
          </Button>
        </MenuTrigger>

        <MenuContent>
          {/* Switch Role */}
          {availableRoles.length > 1 && (
            <>
              <Box px={3} py={2}>
                <Text fontSize="xs" color="gray.500" fontWeight="bold" mb={1}>
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
                    py={2}
                    onClick={() => handleSwitchRole(role)}
                    style={{ cursor: "pointer" }}
                    disabled={switchRoleMutation.isPending}
                  >
                    <FiRefreshCw />
                    <Box flex="1">{roleLabels[role]}</Box>
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
    </Flex>
  )
}

export default UserMenu
