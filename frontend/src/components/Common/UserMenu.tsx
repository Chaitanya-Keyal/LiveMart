import { Badge, Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { FaUserAstronaut } from "react-icons/fa"
import { FiBriefcase, FiLogOut, FiRefreshCw, FiUser } from "react-icons/fi"

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
    <>
      {/* Desktop */}
      <Flex>
        <MenuRoot>
          <MenuTrigger asChild p={2}>
            <Button data-testid="user-menu" variant="solid" maxW="sm" truncate>
              <FaUserAstronaut fontSize="18" />
              <Text>{user?.full_name || "User"}</Text>
            </Button>
          </MenuTrigger>

          <MenuContent>
            {/* Current Role */}
            {activeRole && (
              <>
                <Box px={3} py={2}>
                  <Text fontSize="xs" color="gray.500" fontWeight="bold" mb={1}>
                    ACTIVE ROLE
                  </Text>
                  <Stack direction="row" align="center" gap={2}>
                    <FiBriefcase />
                    <Text fontWeight="semibold">{roleLabels[activeRole]}</Text>
                    <Badge colorScheme="teal" size="sm">
                      Active
                    </Badge>
                  </Stack>
                </Box>
                <MenuSeparator />
              </>
            )}

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
    </>
  )
}

export default UserMenu
