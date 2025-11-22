import {
  Badge,
  Box,
  Button,
  Card,
  createListCollection,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import React from "react"
import { OrdersService } from "@/client"
import PageContainer from "@/components/Common/PageContainer"
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
        label: `${(addr.label ?? "").toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase())}${addr.custom_label ? ` (${addr.custom_label})` : ""} - ${addr.street_address}, ${addr.city}`,
        value: addr.id,
      })),
    ],
  })

  return (
    <PageContainer variant="list">
      <VStack align="start" gap={8} w="100%">
        <Box>
          <Heading size="xl" mb={2}>
            Available Deliveries
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            Find and claim nearby delivery orders
          </Text>
        </Box>

        <Card.Root w="100%">
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
                width="100%"
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
                        label: `${(addr.label ?? "").toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase())}${addr.custom_label ? ` (${addr.custom_label})` : ""} - ${addr.street_address}, ${addr.city}`,
                        value: addr.id,
                      }}
                    >
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium">
                          {(addr.label ?? "")
                            .toLowerCase()
                            .replace(/\b\w/g, (s) => s.toUpperCase())}
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
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6} w="100%">
            {data?.data.map((row: any) => (
              <Box
                key={row.order.id}
                borderWidth="1px"
                rounded="xl"
                p={6}
                bg="bg.surface"
                _hover={{
                  shadow: "lg",
                  borderColor: "brand.primary",
                  transform: "translateY(-2px)",
                }}
                transition="all 0.2s"
              >
                <HStack justify="space-between" align="start" mb={4}>
                  <VStack align="start" gap={1}>
                    <Heading size="sm">{row.order.order_number}</Heading>
                    <OrderStatusBadge status={row.order.order_status} />
                  </VStack>
                  <Button
                    colorPalette="cyan"
                    size="sm"
                    onClick={() => claim.mutate(row.order.id)}
                    loading={claim.isPending}
                  >
                    Claim Order
                  </Button>
                </HStack>

                <VStack align="start" gap={4}>
                  {/* Amount & Fee */}
                  <HStack gap={6}>
                    <Box>
                      <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                        ORDER AMOUNT
                      </Text>
                      <Text
                        fontSize="lg"
                        fontWeight="700"
                        color="brand.primary"
                      >
                        ₹{row.order.order_total}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                        DELIVERY FEE
                      </Text>
                      <Text fontSize="lg" fontWeight="700" color="green.500">
                        ₹{row.order.delivery_fee}
                      </Text>
                    </Box>
                  </HStack>

                  {/* Distance Badges */}
                  <HStack gap={3}>
                    <Badge colorPalette="blue" size="sm">
                      Pickup: {row.pickup_distance_km?.toFixed(1) ?? "-"} km
                    </Badge>
                    <Badge colorPalette="green" size="sm">
                      Journey: {row.journey_distance_km?.toFixed(1) ?? "-"} km
                    </Badge>
                  </HStack>

                  {/* Addresses */}
                  {(row.order.pickup_address_snapshot?.street_address ||
                    row.order.delivery_address_snapshot?.street_address) && (
                    <SimpleGrid
                      columns={{ base: 1, md: 2 }}
                      gap={4}
                      fontSize="sm"
                      pt={2}
                      borderTopWidth="1px"
                    >
                      {row.order.pickup_address_snapshot?.street_address && (
                        <Box>
                          <Text
                            fontSize="xs"
                            color="fg.subtle"
                            fontWeight="600"
                          >
                            PICKUP FROM
                          </Text>
                          <Text fontWeight="500" lineClamp={2}>
                            {row.order.pickup_address_snapshot.street_address}
                          </Text>
                        </Box>
                      )}
                      {row.order.delivery_address_snapshot?.street_address && (
                        <Box>
                          <Text
                            fontSize="xs"
                            color="fg.subtle"
                            fontWeight="600"
                          >
                            DELIVER TO
                          </Text>
                          <Text fontWeight="500" lineClamp={2}>
                            {row.order.delivery_address_snapshot.street_address}
                          </Text>
                        </Box>
                      )}
                    </SimpleGrid>
                  )}
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </PageContainer>
  )
}
