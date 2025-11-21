import {
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Image,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { FiChevronRight } from "react-icons/fi"
import { OrdersService } from "@/client"
import type { OrderPublic, OrderStatus, OrdersPublic } from "@/client/types.gen"
import { OrderStatusBadge } from "@/components/Orders/OrderStatusBadge"
import useCustomToast from "@/hooks/useCustomToast"
import { getPlaceholderImageUrl, getProductImageUrl } from "@/utils/images"

export const Route = createFileRoute("/_layout/delivery/mine")({
  component: DeliveryMinePage,
})

const humanizeStatus = (value?: string | null) =>
  value
    ? value
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : ""

const resolveImage = (path?: string | null) =>
  path ? getProductImageUrl(path) : getPlaceholderImageUrl()

function DeliveryMinePage() {
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery<OrdersPublic>({
    queryKey: ["delivery", "mine"],
    queryFn: () =>
      OrdersService.myDeliveryOrders().then((r) => r as OrdersPublic),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string
      status: OrderStatus
    }) => OrdersService.updateStatus({ orderId, status }),
    onMutate: ({ orderId }) => {
      setUpdatingId(orderId)
    },
    onSuccess: () => {
      showSuccessToast("Status updated")
      refetch()
    },
    onError: (e: any) => showErrorToast(e?.message || "Action failed"),
    onSettled: () => setUpdatingId(null),
  })

  const handleAdvance = (orderId: string, status: OrderStatus) => {
    updateStatusMutation.mutate({ orderId, status })
  }

  return (
    <Stack mt={6} gap={6}>
      <Heading size="md">My Deliveries</Heading>
      {isLoading && <Spinner />}
      {!isLoading && (data?.data?.length || 0) === 0 && (
        <Text>No claimed deliveries yet.</Text>
      )}
      {data && data.data.length > 0 && (
        <Stack gap={4}>
          {data.data.map((order: OrderPublic) => {
            const nextStatus = order.action_hints?.next_status as
              | OrderStatus
              | undefined
            const nextLabel =
              order.action_hints?.next_status_label ||
              (nextStatus ? humanizeStatus(nextStatus) : "")
            const pickupAddress = order.pickup_address_snapshot as
              | { street_address?: string }
              | null
              | undefined
            const deliveryAddress = order.delivery_address_snapshot as
              | { street_address?: string }
              | null
              | undefined
            const totalItems =
              order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
            const assignedDate = new Date(order.created_at).toLocaleDateString()

            return (
              <Stack
                key={order.id}
                borderWidth="1px"
                rounded="lg"
                p={4}
                _hover={{ shadow: "md", borderColor: "accent" }}
                transition="all 0.2s ease"
                gap={3}
                role="button"
                cursor="pointer"
                tabIndex={0}
                onClick={() =>
                  navigate({
                    to: "/orders/$orderId",
                    params: { orderId: order.id },
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    navigate({
                      to: "/orders/$orderId",
                      params: { orderId: order.id },
                    })
                  }
                }}
              >
                <HStack justify="space-between" align="flex-start">
                  <Stack gap={0}>
                    <Text fontWeight="semibold">{order.order_number}</Text>
                    <Text fontSize="xs" color="fg.muted">
                      Assigned on {assignedDate}
                    </Text>
                  </Stack>
                  <OrderStatusBadge status={order.order_status} />
                </HStack>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} fontSize="sm">
                  <Box>
                    <Text color="fg.muted">Payout</Text>
                    <Text fontWeight="semibold">₹{order.order_total}</Text>
                  </Box>
                  <Box>
                    <Text color="fg.muted">Total Items</Text>
                    <Text fontWeight="semibold">{totalItems}</Text>
                  </Box>
                </SimpleGrid>

                {/* Contact Information */}
                <HStack gap={4} fontSize="sm" flexWrap="wrap">
                  {order.seller_contact && (
                    <Box>
                      <Text color="fg.muted" fontSize="xs">
                        Seller
                      </Text>
                      <Text fontWeight="medium">
                        {order.seller_contact.full_name || "N/A"}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {order.seller_contact.email}
                      </Text>
                    </Box>
                  )}
                  {order.buyer_contact && (
                    <Box>
                      <Text color="fg.muted" fontSize="xs">
                        Buyer
                      </Text>
                      <Text fontWeight="medium">
                        {order.buyer_contact.full_name || "N/A"}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {order.buyer_contact.email}
                      </Text>
                    </Box>
                  )}
                </HStack>

                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} fontSize="sm">
                  {pickupAddress?.street_address && (
                    <Box>
                      <Text color="fg.muted">Pickup</Text>
                      <Text fontWeight="semibold" lineClamp={2}>
                        {pickupAddress.street_address}
                      </Text>
                    </Box>
                  )}
                  {deliveryAddress?.street_address && (
                    <Box>
                      <Text color="fg.muted">Deliver To</Text>
                      <Text fontWeight="semibold" lineClamp={2}>
                        {deliveryAddress.street_address}
                      </Text>
                    </Box>
                  )}
                </SimpleGrid>
                {order.items && order.items.length > 0 && (
                  <Wrap gap={4}>
                    {order.items.slice(0, 3).map((item) => (
                      <WrapItem key={item.id} minW="220px">
                        <HStack gap={3} align="flex-start">
                          <Image
                            boxSize="48px"
                            rounded="md"
                            objectFit="cover"
                            src={resolveImage(item.image_path)}
                            alt={item.product_name}
                          />
                          <Stack gap={0} flex={1} minW={0}>
                            <Text
                              fontSize="sm"
                              fontWeight="medium"
                              lineClamp={1}
                            >
                              {item.product_name}
                            </Text>
                            <HStack gap={2} fontSize="xs" color="fg.muted">
                              <Text>x{item.quantity}</Text>
                              <Link
                                to="/buy/$productId"
                                params={{ productId: item.product_id }}
                                onClick={(event) => event.stopPropagation()}
                              >
                                View Product
                              </Link>
                            </HStack>
                          </Stack>
                        </HStack>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}
                {nextStatus && (
                  <Button
                    size="sm"
                    colorPalette="purple"
                    alignSelf="flex-start"
                    loading={
                      updateStatusMutation.isPending && updatingId === order.id
                    }
                    onClick={(event) => {
                      event.stopPropagation()
                      handleAdvance(order.id, nextStatus)
                    }}
                  >
                    Mark as {nextLabel}
                  </Button>
                )}
                <HStack justify="flex-end" fontSize="sm" color="fg.muted">
                  <Text>View details</Text>
                  <Icon as={FiChevronRight} />
                </HStack>
              </Stack>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}
