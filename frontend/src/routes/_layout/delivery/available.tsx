import {
  Badge,
  Button,
  Card,
  createListCollection,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import React from "react"
import { OrdersService } from "@/client"
import { OrderStatusBadge } from "@/components/Orders/OrderStatusBadge"
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "@/components/ui/select"
import useAddresses from "@/hooks/useAddresses"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { useGeolocation } from "@/hooks/useGeolocation"

export const Route = createFileRoute("/_layout/delivery/available")({
  component: DeliveryAvailablePage,
})

type LocationSource = "current" | string // "current" or address ID

function DeliveryAvailablePage() {
  const toast = useCustomToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { addresses, isLoading: addressesLoading } = useAddresses()
  const { lat: geoLat, lon: geoLon, loading: geoLoading } = useGeolocation()

  // Default to active address if available, else current location
  const [locationSource, setLocationSource] = React.useState<LocationSource>(
    user?.active_address_id || "current",
  )

  // Determine actual coordinates based on selection
  const { lat, lon } = React.useMemo(() => {
    if (locationSource === "current") {
      return { lat: geoLat, lon: geoLon }
    }
    const addr = addresses.find((a) => a.id === locationSource)
    return addr
      ? { lat: Number(addr.latitude), lon: Number(addr.longitude) }
      : { lat: null, lon: null }
  }, [locationSource, geoLat, geoLon, addresses])

  const { data, isLoading } = useQuery({
    queryKey: ["delivery", "available", lat, lon],
    enabled: lat !== null && lon !== null,
    queryFn: async () => {
      const result = await OrdersService.availableDeliveries({
        latitude: lat!,
        longitude: lon!,
      })
      return result as { data: any[] }
    },
  })

  const claim = useMutation({
    mutationFn: (id: string) => OrdersService.claimDelivery({ orderId: id }),
    onSuccess: () => {
      toast.showSuccessToast("Order claimed successfully")
      queryClient.invalidateQueries({ queryKey: ["delivery", "available"] })
      queryClient.invalidateQueries({ queryKey: ["delivery", "mine"] })
    },
    onError: (e: any) =>
      toast.showErrorToast(e?.body?.detail || "Failed to claim order"),
  })

  const handleLocationChange = (details: { value: string[] }) => {
    if (details.value.length > 0) {
      setLocationSource(details.value[0])
    }
  }

  const isLoadingLocation =
    (locationSource === "current" && geoLoading) || addressesLoading

  const locationItems = createListCollection({
    items: [
      { label: "Current Location", value: "current" },
      ...addresses.map((addr) => ({
        label: `${addr.label}${addr.custom_label ? ` (${addr.custom_label})` : ""} - ${addr.street_address}, ${addr.city}`,
        value: addr.id,
      })),
    ],
  })

  return (
    <Stack gap={6} maxW="4xl" mx="auto" p={6}>
      <VStack align="stretch" gap={4}>
        <Heading size="lg">Available Deliveries</Heading>

        <Card.Root>
          <Card.Body>
            <VStack align="stretch" gap={3}>
              <Text fontWeight="medium" fontSize="sm" color="fg.muted">
                Search from location:
              </Text>
              <SelectRoot
                collection={locationItems}
                value={[locationSource]}
                onValueChange={handleLocationChange}
                size="sm"
              >
                <SelectTrigger>
                  <SelectValueText placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    item={{ label: "Current Location", value: "current" }}
                  >
                    Current Location
                  </SelectItem>
                  {addresses.map((addr) => (
                    <SelectItem
                      key={addr.id}
                      item={{
                        label: `${addr.label}${addr.custom_label ? ` (${addr.custom_label})` : ""} - ${addr.street_address}, ${addr.city}`,
                        value: addr.id,
                      }}
                    >
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium">
                          {addr.label}
                          {addr.custom_label && ` (${addr.custom_label})`}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          {addr.street_address}, {addr.city}
                        </Text>
                      </VStack>
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>

      {isLoadingLocation || isLoading ? (
        <HStack justify="center" py={8}>
          <Spinner size="lg" />
          <Text color="fg.muted">Loading deliveries...</Text>
        </HStack>
      ) : lat === null || lon === null ? (
        <Card.Root>
          <Card.Body>
            <Text textAlign="center" color="fg.muted">
              Unable to determine location. Please select a saved address or
              enable location access.
            </Text>
          </Card.Body>
        </Card.Root>
      ) : data?.data?.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <Text textAlign="center" color="fg.muted">
              No deliveries available nearby.
            </Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <VStack align="stretch" gap={3}>
          {data?.data.map((row: any) => (
            <Card.Root key={row.order.id}>
              <Card.Body>
                <HStack justify="space-between" align="start">
                  <VStack align="start" flex={1} gap={2}>
                    <HStack>
                      <Text fontWeight="bold" fontSize="lg">
                        {row.order.order_number}
                      </Text>
                      <OrderStatusBadge status={row.order.order_status} />
                    </HStack>

                    {/* Contact Information */}
                    <VStack align="start" gap={1} fontSize="sm">
                      {row.order.seller_contact && (
                        <HStack gap={1}>
                          <Text fontWeight="medium" color="fg.muted">
                            Seller:
                          </Text>
                          <Text>
                            {row.order.seller_contact.full_name || "N/A"} (
                            {row.order.seller_contact.email})
                          </Text>
                        </HStack>
                      )}
                      {row.order.buyer_contact && (
                        <HStack gap={1}>
                          <Text fontWeight="medium" color="fg.muted">
                            Buyer:
                          </Text>
                          <Text>
                            {row.order.buyer_contact.full_name || "N/A"} (
                            {row.order.buyer_contact.email})
                          </Text>
                        </HStack>
                      )}
                    </VStack>

                    <HStack gap={4} fontSize="sm" color="fg.muted" wrap="wrap">
                      <HStack gap={1}>
                        <Text fontWeight="medium">Amount:</Text>
                        <Text>₹{row.order.order_total}</Text>
                      </HStack>
                      <HStack gap={1}>
                        <Text fontWeight="medium">Delivery Fee:</Text>
                        <Text>₹{row.order.delivery_fee}</Text>
                      </HStack>
                    </HStack>

                    <HStack gap={4} fontSize="sm" wrap="wrap">
                      <Badge colorPalette="blue">
                        Pickup: {row.pickup_distance_km?.toFixed(1) ?? "-"} km
                      </Badge>
                      <Badge colorPalette="green">
                        Journey: {row.journey_distance_km?.toFixed(1) ?? "-"} km
                      </Badge>
                    </HStack>
                  </VStack>

                  <Button
                    colorPalette="teal"
                    size="sm"
                    onClick={() => claim.mutate(row.order.id)}
                    loading={claim.isPending}
                  >
                    Claim Order
                  </Button>
                </HStack>
              </Card.Body>
            </Card.Root>
          ))}
        </VStack>
      )}
    </Stack>
  )
}
