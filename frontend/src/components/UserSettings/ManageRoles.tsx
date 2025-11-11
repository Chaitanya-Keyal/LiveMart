import {
  Badge,
  Box,
  createListCollection,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useState } from "react"
import { FiAlertTriangle, FiCheck, FiTrash2 } from "react-icons/fi"

import type { RoleEnum } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "@/components/ui/select"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

const roleLabels: Record<RoleEnum, string> = {
  admin: "Admin",
  customer: "Customer",
  retailer: "Retailer",
  wholesaler: "Wholesaler",
  delivery_partner: "Delivery Partner",
}

const roleDescriptions: Record<RoleEnum, string> = {
  admin: "Full platform access",
  customer: "Browse and purchase items",
  retailer: "Manage inventory and sell to customers",
  wholesaler: "Supply products to retailers in bulk",
  delivery_partner: "Deliver orders to customers",
}

const availableRolesToAdd: RoleEnum[] = [
  "customer",
  "retailer",
  "wholesaler",
  "delivery_partner",
]

function ManageRoles() {
  const { showSuccessToast } = useCustomToast()
  const {
    activeRole,
    availableRoles,
    switchRoleMutation,
    addRoleMutation,
    removeRoleMutation,
  } = useAuth()
  const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({})

  const handleSwitchRole = async (role: RoleEnum) => {
    try {
      await switchRoleMutation.mutateAsync(role)
      showSuccessToast(`Switched to ${roleLabels[role]} role`)
    } catch {
      // Error is handled by mutation
    }
  }

  const handleAddRole = async (role: RoleEnum) => {
    try {
      await addRoleMutation.mutateAsync(role)
      showSuccessToast(`${roleLabels[role]} role added`)
    } catch {
      // Error is handled by mutation
    }
  }

  const handleRemoveRole = async (role: RoleEnum) => {
    try {
      await removeRoleMutation.mutateAsync(role)
      showSuccessToast(`${roleLabels[role]} role removed`)
      setOpenDialogs({ ...openDialogs, [role]: false })
    } catch {
      // Error is handled by mutation
    }
  }

  const rolesToAdd = availableRolesToAdd.filter(
    (role) => !availableRoles.includes(role),
  )

  return (
    <Box>
      <Heading size="lg" mb={4}>
        Manage Roles
      </Heading>
      <Text color="gray.600" mb={6}>
        Add or remove roles to access different features. Each role maintains
        separate data.
      </Text>

      {/* Current Active Role */}
      <Box mb={6}>
        <Text fontWeight="semibold" mb={2}>
          Active Role
        </Text>
        <Box p={4} borderWidth="2px" borderColor="teal.500" borderRadius="lg">
          <Stack direction="row" justify="space-between" align="center">
            <Box>
              <Text fontWeight="bold" fontSize="lg">
                {activeRole ? roleLabels[activeRole] : "No active role"}
              </Text>
              <Text color="gray.600" fontSize="sm">
                {activeRole
                  ? roleDescriptions[activeRole]
                  : "Please select a role"}
              </Text>
            </Box>
            <Badge colorScheme="teal">Active</Badge>
          </Stack>
        </Box>
      </Box>

      {/* Available Roles */}
      <Box mb={6}>
        <Text fontWeight="semibold" mb={2}>
          Your Roles
        </Text>
        <Stack direction="column" gap={3}>
          {availableRoles.map((role) => (
            <Box key={role} p={4} borderWidth="1px" borderRadius="lg">
              <Stack direction="row" justify="space-between" align="center">
                <Box flex="1">
                  <Text fontWeight="bold">{roleLabels[role]}</Text>
                  <Text color="gray.600" fontSize="sm">
                    {roleDescriptions[role]}
                  </Text>
                </Box>
                <Stack direction="row" gap={2}>
                  {role !== activeRole && (
                    <Button
                      size="sm"
                      onClick={() => handleSwitchRole(role)}
                      loading={switchRoleMutation.isPending}
                    >
                      <FiCheck /> Switch
                    </Button>
                  )}
                  {role !== "admin" && availableRoles.length > 1 && (
                    <DialogRoot
                      open={openDialogs[role]}
                      onOpenChange={(e) =>
                        setOpenDialogs({ ...openDialogs, [role]: e.open })
                      }
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" colorScheme="red">
                          <FiTrash2 />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Remove Role</DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                          <Stack gap={4}>
                            <Box
                              p={3}
                              bg="orange.50"
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor="orange.200"
                            >
                              <Stack direction="row" gap={2} align="start">
                                <FiAlertTriangle color="orange" size={20} />
                                <Box>
                                  <Text fontWeight="bold" color="orange.800">
                                    Warning: Data will be inaccessible
                                  </Text>
                                  <Text fontSize="sm" color="orange.700">
                                    Removing this role will make all data
                                    created as a {roleLabels[role]}{" "}
                                    inaccessible. You can add the role back
                                    later to access the data again.
                                  </Text>
                                </Box>
                              </Stack>
                            </Box>
                            <Text>
                              Are you sure you want to remove the{" "}
                              {roleLabels[role]} role?
                            </Text>
                          </Stack>
                        </DialogBody>
                        <DialogFooter>
                          <DialogActionTrigger asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogActionTrigger>
                          <Button
                            colorScheme="red"
                            onClick={() => handleRemoveRole(role)}
                            loading={removeRoleMutation.isPending}
                          >
                            Remove Role
                          </Button>
                        </DialogFooter>
                        <DialogCloseTrigger />
                      </DialogContent>
                    </DialogRoot>
                  )}
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Add New Role */}
      {rolesToAdd.length > 0 && (
        <Box>
          <Text fontWeight="semibold" mb={2}>
            Add New Role
          </Text>
          <SelectRoot
            collection={createListCollection({
              items: rolesToAdd.map((r) => ({
                value: r,
                label: roleLabels[r],
              })),
            })}
            size="md"
            onValueChange={(details: { value: string[] }) =>
              details.value.length > 0 &&
              handleAddRole(details.value[0] as RoleEnum)
            }
          >
            <SelectTrigger>
              <SelectValueText placeholder="Select a role to add" />
            </SelectTrigger>
            <SelectContent>
              {rolesToAdd.map((role) => (
                <SelectItem
                  item={{ value: role, label: roleLabels[role] }}
                  key={role}
                >
                  {roleLabels[role]} - {roleDescriptions[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        </Box>
      )}
    </Box>
  )
}

export default ManageRoles
