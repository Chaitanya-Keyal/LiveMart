import {
  Badge,
  Box,
  Heading,
  Separator,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useMemo, useState } from "react"
import { FiCheck, FiEdit2, FiMapPin, FiPlus, FiTrash2 } from "react-icons/fi"

import type { AddressCreate, AddressLabelEnum, AddressPublic } from "@/client"
import AddressForm, {
  type AddressFormValues,
} from "@/components/UserSettings/AddressForm"
import { Button } from "@/components/ui/button"
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog"
import useAddresses from "@/hooks/useAddresses"
import useCustomToast from "@/hooks/useCustomToast"
import { roundCoordinate } from "@/utils"

const formatLabel = (label?: AddressLabelEnum, custom?: string | null) => {
  if (label === "custom") {
    return custom || "Custom"
  }
  if (!label) return "Home"
  const normalized = `${label ?? "home"}`.split("_").join(" ")
  return normalized
    .split(" ")
    .map((word) =>
      word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : "",
    )
    .join(" ")
}

const getFormValues = (address?: AddressPublic): AddressFormValues => ({
  street_address: address?.street_address ?? "",
  apartment_suite: address?.apartment_suite ?? "",
  city: address?.city ?? "",
  state: address?.state ?? "",
  postal_code: address?.postal_code ?? "",
  country: address?.country ?? "",
  label: (address?.label as AddressLabelEnum) ?? "home",
  custom_label: address?.custom_label ?? "",
  latitude: address?.latitude,
  longitude: address?.longitude,
  additional_notes: address?.additional_notes ?? "",
})

const toPayload = (values: AddressFormValues): AddressCreate => {
  if (values.latitude == null || values.longitude == null) {
    throw new Error("Coordinates are required")
  }

  return {
    street_address: values.street_address.trim(),
    apartment_suite: values.apartment_suite?.trim() || null,
    city: values.city.trim(),
    state: values.state.trim(),
    postal_code: values.postal_code.trim(),
    country: values.country.trim(),
    label: values.label,
    custom_label:
      values.label === "custom" ? values.custom_label?.trim() || null : null,
    latitude: roundCoordinate(values.latitude),
    longitude: roundCoordinate(values.longitude),
    additional_notes: values.additional_notes?.trim() || null,
  }
}

const emptyStateCopy = {
  title: "No addresses yet",
  description: "Save delivery-ready addresses to speed up checkout.",
}

const ManageAddresses = () => {
  const { showSuccessToast } = useCustomToast()
  const {
    addresses,
    isLoading,
    createAddressMutation,
    updateAddressMutation,
    deleteAddressMutation,
    setActiveAddressMutation,
  } = useAddresses()

  const [dialogState, setDialogState] = useState<
    { mode: "create" } | { mode: "edit"; address: AddressPublic } | null
  >(null)

  const sortedAddresses = useMemo(() => {
    return [...addresses].sort(
      (a, b) => Number(b.is_active) - Number(a.is_active),
    )
  }, [addresses])

  const closeDialog = () => setDialogState(null)

  const handleSave = async (values: AddressFormValues) => {
    if (!values.latitude || !values.longitude) {
      return
    }
    const payload = toPayload(values)
    try {
      if (!dialogState || dialogState.mode === "create") {
        await createAddressMutation.mutateAsync(payload)
        showSuccessToast("Address saved")
      } else {
        await updateAddressMutation.mutateAsync({
          id: dialogState.address.id,
          data: payload,
        })
        showSuccessToast("Address updated")
      }
      closeDialog()
    } catch {
      // handled by mutation
    }
  }

  const handleDelete = async (address: AddressPublic) => {
    try {
      await deleteAddressMutation.mutateAsync(address.id)
      showSuccessToast("Address removed")
    } catch {
      // handled by mutation
    }
  }

  const handleSetActive = async (addressId: string) => {
    try {
      await setActiveAddressMutation.mutateAsync(addressId)
      showSuccessToast("Active address updated")
    } catch {
      // handled by mutation
    }
  }

  const isDialogOpen = dialogState !== null
  const dialogDefaultValues = getFormValues(
    dialogState?.mode === "edit" ? dialogState.address : undefined,
  )

  return (
    <Box>
      <Stack
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        gap={3}
      >
        <Box>
          <Heading size="md">Delivery addresses</Heading>
          <Text color="fg.muted" fontSize="sm">
            Set a default drop-off point and keep multiple addresses for
            convenience.
          </Text>
        </Box>
        <Button gap={2} onClick={() => setDialogState({ mode: "create" })}>
          <FiPlus />
          Add address
        </Button>
      </Stack>

      <Box mt={6}>
        {(() => {
          if (isLoading) {
            return (
              <Stack align="center" py={10}>
                <Spinner />
                <Text color="fg.muted">Loading addresses...</Text>
              </Stack>
            )
          }

          if (sortedAddresses.length === 0) {
            return (
              <Box
                borderWidth="1px"
                borderStyle="dashed"
                borderRadius="lg"
                p={8}
                textAlign="center"
              >
                <Heading size="sm" mb={2}>
                  {emptyStateCopy.title}
                </Heading>
                <Text color="fg.muted" fontSize="sm">
                  {emptyStateCopy.description}
                </Text>
              </Box>
            )
          }

          return (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {sortedAddresses.map((address) => (
                <Box
                  key={address.id}
                  borderWidth="1px"
                  borderRadius="lg"
                  p={4}
                  borderColor={
                    address.is_active ? "brand.primary" : "border.default"
                  }
                  minH="280px"
                  display="flex"
                  flexDirection="column"
                >
                  <Stack gap={2} flex="1">
                    <Stack
                      direction="row"
                      justify="space-between"
                      align="center"
                    >
                      <Stack direction="row" gap={2} align="center">
                        <FiMapPin color={address.is_active ? "teal" : "gray"} />
                        <Text fontWeight="bold">
                          {formatLabel(
                            address.label as AddressLabelEnum,
                            address.custom_label,
                          )}
                        </Text>
                      </Stack>
                      {address.is_active && (
                        <Badge colorPalette="cyan">Active</Badge>
                      )}
                    </Stack>

                    <Text>{address.street_address}</Text>
                    <Box minH="24px">
                      {address.apartment_suite && (
                        <Text color="fg.default">
                          {address.apartment_suite}
                        </Text>
                      )}
                    </Box>
                    <Text color="fg.default">
                      {address.city}, {address.state} {address.postal_code}
                    </Text>
                    <Text color="fg.muted">{address.country}</Text>
                    <Text fontSize="xs" color="fg.subtle">
                      Lat: {address.latitude.toFixed(6)} • Lng:{" "}
                      {address.longitude.toFixed(6)}
                    </Text>
                    <Box minH="40px" mb={2}>
                      {address.additional_notes && (
                        <Text fontSize="sm" color="fg.muted">
                          Notes: {address.additional_notes}
                        </Text>
                      )}
                    </Box>
                  </Stack>

                  <Box mt="auto">
                    <Separator mb={3} />
                    <Stack direction="row" gap={2}>
                      {!address.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          colorPalette="cyan"
                          gap={2}
                          onClick={() => handleSetActive(address.id)}
                          loading={setActiveAddressMutation.isPending}
                        >
                          <FiCheck />
                          Set active
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        gap={2}
                        onClick={() =>
                          setDialogState({ mode: "edit", address })
                        }
                      >
                        <FiEdit2 />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        gap={2}
                        onClick={() => handleDelete(address)}
                        loading={deleteAddressMutation.isPending}
                      >
                        <FiTrash2 />
                        Delete
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          )
        })()}
      </Box>

      <DialogRoot
        open={isDialogOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            closeDialog()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState?.mode === "edit" ? "Edit address" : "Add address"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <AddressForm
              key={
                dialogState?.mode === "edit"
                  ? dialogState.address.id
                  : "create-address"
              }
              defaultValues={dialogDefaultValues}
              mode={dialogState?.mode === "edit" ? "edit" : "create"}
              onSubmit={handleSave}
              onCancel={closeDialog}
              isSubmitting={
                createAddressMutation.isPending ||
                updateAddressMutation.isPending
              }
            />
          </DialogBody>
          <DialogFooter>
            <Text fontSize="sm" color="fg.muted">
              Exact coordinates ensure delivery partners can reach you.
            </Text>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </Box>
  )
}

export default ManageAddresses
