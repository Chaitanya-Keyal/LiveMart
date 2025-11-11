import { Box, Container, Heading, Stack, Text } from "@chakra-ui/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import {
  FiPackage,
  FiShoppingBag,
  FiShoppingCart,
  FiTruck,
} from "react-icons/fi"

import type { RoleEnum } from "@/client"
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
  const { addRoleMutation, switchRoleMutation } = useAuth()
  const [selectedRole, setSelectedRole] = useState<RoleEnum | null>(null)

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
    if (!selectedRole) {
      showErrorToast("Please select a role")
      return
    }

    try {
      // For new OAuth users, they already have CUSTOMER role by default
      // We need to check if they're selecting a different role
      if (newUser === "true") {
        // If they selected a non-customer role, add it
        if (selectedRole !== "customer") {
          await addRoleMutation.mutateAsync(selectedRole)
        }
        // Switch to the selected role
        await switchRoleMutation.mutateAsync(selectedRole)
      } else {
        // Normal flow: add the role then switch to it
        await addRoleMutation.mutateAsync(selectedRole)
        await switchRoleMutation.mutateAsync(selectedRole)
      }

      showSuccessToast(`Welcome! You're now signed in as a ${selectedRole}`)
      navigate({ to: "/" })
    } catch {
      // Error is handled by the mutation
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
          const isSelected = selectedRole === option.role

          return (
            <Box
              key={option.role}
              p={6}
              borderWidth="2px"
              borderColor={isSelected ? "teal.500" : "gray.200"}
              borderRadius="lg"
              cursor="pointer"
              onClick={() => setSelectedRole(option.role)}
              _hover={{ borderColor: "teal.300", bg: "teal.25" }}
              transition="all 0.2s"
            >
              <Stack direction="row" align="center" gap={4}>
                <Box
                  fontSize="3xl"
                  color={isSelected ? "teal.600" : "gray.500"}
                >
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
        disabled={!selectedRole}
        loading={addRoleMutation.isPending || switchRoleMutation.isPending}
      >
        Continue
      </Button>
    </Container>
  )
}
