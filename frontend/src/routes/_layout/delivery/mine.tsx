import {
  Box,
  Button,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { OrdersService } from "@/client"
import type { OrderPublic, OrderStatus, OrdersPublic } from "@/client/types.gen"
import PageContainer from "@/components/Common/PageContainer"
import { OrderStatusBadge } from "@/components/Orders/OrderStatusBadge"
import useCustomToast from "@/hooks/useCustomToast"

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
    <PageContainer variant="list">
      <VStack align="start" gap={8} w="100%">
        <Box>
          <Heading size="xl" mb={2}>
            My Deliveries
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            Track your claimed delivery orders
          </Text>
        </Box>
        {isLoading && (
          <HStack justify="center" py={12}>
            <Spinner size="xl" />
            <Text fontSize="lg" color="fg.muted">
              Loading deliveries...
            </Text>
          </HStack>
        )}
        {!isLoading && (data?.data?.length || 0) === 0 && (
          <Box textAlign="center" py={12}>
            <Text fontSize="lg" color="fg.muted">
              No claimed deliveries yet.
            </Text>
          </Box>
        )}
        {data && data.data.length > 0 && (
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6} w="100%">
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
              const assignedDate = new Date(
                order.created_at,
              ).toLocaleDateString()

              return (
                <Box
                  key={order.id}
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
                  gap={4}
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
                  <HStack justify="space-between" align="flex-start" mb={4}>
                    <VStack align="start" gap={1}>
                      <Heading size="sm">{order.order_number}</Heading>
                      <Text fontSize="sm" color="fg.muted">
                        Assigned {assignedDate}
                      </Text>
                    </VStack>
                    <OrderStatusBadge status={order.order_status} />
                  </HStack>
                  <VStack align="start" gap={4}>
                    <SimpleGrid columns={{ base: 2 }} gap={6}>
                      <Box>
                        <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                          DELIVERY FEE
                        </Text>
                        <Text
                          fontSize="xl"
                          fontWeight="700"
                          color="brand.primary"
                        >
                          ₹{order.delivery_fee || 0}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                          ITEMS
                        </Text>
                        <Text fontSize="lg" fontWeight="700">
                          {totalItems}
                        </Text>
                      </Box>
                    </SimpleGrid>

                    {(order.seller_contact || order.buyer_contact) && (
                      <HStack
                        gap={6}
                        fontSize="sm"
                        flexWrap="wrap"
                        pt={4}
                        borderTopWidth="1px"
                      >
                        {order.seller_contact && (
                          <Box>
                            <Text
                              fontSize="xs"
                              color="fg.subtle"
                              fontWeight="600"
                            >
                              SELLER
                            </Text>
                            <Text fontWeight="500">
                              {order.seller_contact.full_name || "N/A"}
                            </Text>
                            <Text fontSize="xs" color="fg.muted">
                              {order.seller_contact.email}
                            </Text>
                          </Box>
                        )}
                        {order.buyer_contact && (
                          <Box>
                            <Text
                              fontSize="xs"
                              color="fg.subtle"
                              fontWeight="600"
                            >
                              BUYER
                            </Text>
                            <Text fontWeight="500">
                              {order.buyer_contact.full_name || "N/A"}
                            </Text>
                            <Text fontSize="xs" color="fg.muted">
                              {order.buyer_contact.email}
                            </Text>
                          </Box>
                        )}
                      </HStack>
                    )}

                    {(pickupAddress?.street_address ||
                      deliveryAddress?.street_address) && (
                      <SimpleGrid
                        columns={{ base: 1, md: 2 }}
                        gap={4}
                        fontSize="sm"
                        pt={4}
                        borderTopWidth="1px"
                      >
                        {pickupAddress?.street_address && (
                          <Box>
                            <Text
                              fontSize="xs"
                              color="fg.subtle"
                              fontWeight="600"
                            >
                              PICKUP FROM
                            </Text>
                            <Text fontWeight="500" lineClamp={2}>
                              {pickupAddress.street_address}
                            </Text>
                          </Box>
                        )}
                        {deliveryAddress?.street_address && (
                          <Box>
                            <Text
                              fontSize="xs"
                              color="fg.subtle"
                              fontWeight="600"
                            >
                              DELIVER TO
                            </Text>
                            <Text fontWeight="500" lineClamp={2}>
                              {deliveryAddress.street_address}
                            </Text>
                          </Box>
                        )}
                      </SimpleGrid>
                    )}
                    {nextStatus && (
                      <Button
                        size="sm"
                        colorPalette="cyan"
                        alignSelf="flex-start"
                        mt={4}
                        loading={
                          updateStatusMutation.isPending &&
                          updatingId === order.id
                        }
                        onClick={(event) => {
                          event.stopPropagation()
                          handleAdvance(order.id, nextStatus)
                        }}
                      >
                        Mark as {nextLabel}
                      </Button>
                    )}
                  </VStack>
                </Box>
              )
            })}
          </SimpleGrid>
        )}
      </VStack>
    </PageContainer>
  )
}
