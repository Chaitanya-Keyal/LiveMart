import { Box, Container, Heading, Stack, Text } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import {
  FiPackage,
  FiShoppingBag,
  FiShoppingCart,
  FiTruck,
} from "react-icons/fi"

import { type RoleEnum, type RoleSwitch, UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/select-role")({
  component: SelectRole,
})

const roleOptions: {
  role: RoleEnum
  label: string
  description: string
  icon: any
}[] = [
  {
    role: "customer",
    label: "Customer",
    description: "Browse and purchase items from retailers",
    icon: FiShoppingCart,
  },
  {
    role: "retailer",
    label: "Retailer",
    description: "Manage inventory and sell to customers",
    icon: FiShoppingBag,
  },
  {
    role: "wholesaler",
    label: "Wholesaler",
    description: "Supply products to retailers in bulk",
    icon: FiPackage,
  },
  {
    role: "delivery_partner",
    label: "Delivery Partner",
    description: "Deliver orders to customers",
    icon: FiTruck,
  },
]

function SelectRole() {
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { addRoleMutation, removeRoleMutation } = useAuth()
  const queryClient = useQueryClient()
  const [selectedRoles, setSelectedRoles] = useState<RoleEnum[]>([])

  // Get search params from URL
  const searchParams = new URLSearchParams(globalThis.location.search)
  const token = searchParams.get("token")
  const newUser = searchParams.get("new_user")

  useEffect(() => {
    // If token is provided, save it
    if (token) {
      localStorage.setItem("access_token", token)
    }
  }, [token])

  const handleRoleSelect = async () => {
    if (selectedRoles.length === 0) {
      showErrorToast("Please select at least one role")
      return
    }

    try {
      // For new OAuth users, they already have CUSTOMER role by default.
      // Add any selected roles that are not customer (if customer is already present).
      for (const role of selectedRoles) {
        if (newUser === "true") {
          if (role !== "customer") {
            await addRoleMutation.mutateAsync(role)
          }
        } else {
          await addRoleMutation.mutateAsync(role)
        }
      }

      // For new OAuth users: if customer is NOT selected, remove it so user's selection is final
      if (
        newUser === "true" &&
        !selectedRoles.includes("customer" as RoleEnum)
      ) {
        await removeRoleMutation.mutateAsync("customer" as RoleEnum)
      }

      // Switch to the first selected role (primary context) without full reload
      await UsersService.switchUserRole({
        requestBody: { role: selectedRoles[0] } as RoleSwitch,
      })
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] })

      showSuccessToast(
        `Welcome! You're now signed in with roles: ${selectedRoles.join(", ")}`,
      )
      navigate({ to: "/" })
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <Container
      h="100vh"
      maxW="2xl"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      gap={6}
      centerContent
    >
      <Heading size="2xl" textAlign="center">
        Select Your Role
      </Heading>
      <Text color="gray.500" textAlign="center" fontSize="lg">
        {newUser === "true"
          ? "Welcome! Please select your primary role to get started."
          : "Choose the role you want to use for this account."}
      </Text>

      <Stack direction="column" gap={4} w="100%" mt={4}>
        {roleOptions.map((option) => {
          const Icon = option.icon
          const isSelected = selectedRoles.includes(option.role)

          const toggleRole = () => {
            setSelectedRoles((prev) =>
              prev.includes(option.role)
                ? prev.filter((r) => r !== option.role)
                : [...prev, option.role],
            )
          }

          return (
            <Box
              key={option.role}
              p={6}
              borderWidth="2px"
              borderColor={isSelected ? "teal.500" : "gray.200"}
              borderRadius="lg"
              cursor="pointer"
              onClick={toggleRole}
              _hover={{
                borderColor: "teal.300",
              }}
              transition="all 0.2s"
              position="relative"
            >
              <Stack direction="row" align="center" gap={4}>
                <Box fontSize="3xl">
                  <Icon />
                </Box>
                <Box flex="1">
                  <Heading size="md" mb={1}>
                    {option.label}
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    {option.description}
                  </Text>
                </Box>
                {isSelected && (
                  <Box as="span" fontSize="sm" fontWeight="semibold">
                    Selected
                  </Box>
                )}
              </Stack>
            </Box>
          )
        })}
      </Stack>

      <Button
        w="100%"
        size="lg"
        mt={4}
        onClick={handleRoleSelect}
        disabled={selectedRoles.length === 0}
        loading={addRoleMutation.isPending}
      >
        {selectedRoles.length === 0
          ? "Select at least one role"
          : `Continue with ${selectedRoles.length} role${selectedRoles.length > 1 ? "s" : ""}`}
      </Button>
    </Container>
  )
}
