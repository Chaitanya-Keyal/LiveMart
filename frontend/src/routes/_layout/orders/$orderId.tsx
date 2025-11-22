import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { OrdersService } from "@/client"
import type {
  OrderActionHints,
  OrderItemPublic,
  OrderPublic,
  OrderStatus,
} from "@/client/types.gen"
import PageContainer from "@/components/Common/PageContainer"
import { OrderStatusBadge } from "@/components/Orders/OrderStatusBadge"
import { OrderTimeline } from "@/components/Orders/OrderTimeline"
import useAuth from "@/hooks/useAuth"
import { useCloneProduct } from "@/hooks/useCloneProduct"
import useCustomToast from "@/hooks/useCustomToast"
import { getPlaceholderImageUrl, getProductImageUrl } from "@/utils/images"

export const Route = createFileRoute("/_layout/orders/$orderId")({
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const { activeRole, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const cloneMutation = useCloneProduct()

  const { data, isLoading } = useQuery<OrderPublic>({
    queryKey: ["order", orderId],
    queryFn: () =>
      OrdersService.getOrder({ orderId }).then((r) => r as OrderPublic),
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      OrdersService.updateStatus({ orderId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      showSuccessToast("Status updated")
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Update failed")
    },
  })

  if (isLoading) {
    return (
      <PageContainer variant="detail">
        <HStack justify="center" py={12}>
          <Spinner size="xl" />
          <Text fontSize="lg" color="fg.muted">
            Loading order...
          </Text>
        </HStack>
      </PageContainer>
    )
  }

  if (!data) {
    return (
      <PageContainer variant="detail">
        <Box textAlign="center" py={12}>
          <Heading size="lg" mb={2}>
            Order Not Found
          </Heading>
          <Text color="fg.muted">
            The order you're looking for doesn't exist.
          </Text>
        </Box>
      </PageContainer>
    )
  }

  const actionHints: OrderActionHints | null | undefined = data.action_hints
  const placedDate = new Date(data.created_at).toLocaleString()
  const deliveryAddress = data.delivery_address_snapshot as
    | { street_address?: string }
    | null
    | undefined
  const formatCurrency = (value?: string | null) => {
    const amount = Number(value || 0)
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const humanizeStatus = (value?: string | null) =>
    value
      ? value
          .replace(/_/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : ""

  const totalItems =
    data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0

  const handleAdvance = (nextStatus: OrderStatus) => {
    updateStatusMutation.mutate(nextStatus)
  }

  const resolveImage = (path?: string | null) =>
    path ? getProductImageUrl(path) : getPlaceholderImageUrl()

  const canAct = Boolean(
    activeRole &&
      ["retailer", "wholesaler", "delivery_partner"].includes(activeRole),
  )

  const enableClone = Boolean(
    activeRole === "retailer" &&
      user?.id === data.buyer_id &&
      data.order_status === "delivered",
  )

  return (
    <PageContainer variant="detail">
      <VStack align="start" gap={8} w="100%">
        {/* Header Section */}
        <HStack justify="space-between" w="100%" flexWrap="wrap" gap={4}>
          <VStack align="start" gap={1}>
            <Heading size="xl">Order {data.order_number}</Heading>
            <Text fontSize="md" color="fg.muted">
              Placed on {placedDate}
            </Text>
          </VStack>
          <OrderStatusBadge status={data.order_status} />
        </HStack>

        {/* Main Order Card */}
        <Box borderWidth="1px" rounded="xl" p={6} bg="bg.surface" w="100%">
          <VStack align="start" gap={6}>
            {/* Financial Summary */}
            <Box w="100%">
              <Text fontSize="xs" color="fg.subtle" fontWeight="600" mb={3}>
                {activeRole === "delivery_partner"
                  ? "DELIVERY INFORMATION"
                  : "ORDER SUMMARY"}
              </Text>
              {activeRole === "delivery_partner" ? (
                <SimpleGrid columns={{ base: 2, md: 3 }} gap={6}>
                  <Box>
                    <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                      DELIVERY FEE
                    </Text>
                    <Text fontSize="xl" fontWeight="700" color="brand.primary">
                      {formatCurrency(data.delivery_fee)}
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
              ) : (
                <SimpleGrid columns={{ base: 2, md: 4 }} gap={6}>
                  <Box>
                    <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                      SUBTOTAL
                    </Text>
                    <Text fontSize="lg" fontWeight="700">
                      {formatCurrency(data.order_subtotal)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                      DELIVERY FEE
                    </Text>
                    <Text fontSize="lg" fontWeight="700">
                      {formatCurrency(data.delivery_fee)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                      TOTAL
                    </Text>
                    <Text fontSize="xl" fontWeight="700" color="brand.primary">
                      {formatCurrency(data.order_total)}
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
              )}
            </Box>

            {/* Contact Information */}
            {(data.seller_contact ||
              data.buyer_contact ||
              data.delivery_partner_contact) && (
              <Box w="100%" pt={4} borderTopWidth="1px">
                <Text fontSize="xs" color="fg.subtle" fontWeight="600" mb={3}>
                  CONTACT INFORMATION
                </Text>
                <HStack gap={6} flexWrap="wrap">
                  {data.seller_contact && (
                    <Box>
                      <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                        SELLER
                      </Text>
                      <Text fontWeight="500">
                        {data.seller_contact.full_name || "N/A"}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {data.seller_contact.email}
                      </Text>
                    </Box>
                  )}
                  {data.buyer_contact && activeRole !== "customer" && (
                    <Box>
                      <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                        BUYER
                      </Text>
                      <Text fontWeight="500">
                        {data.buyer_contact.full_name || "N/A"}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {data.buyer_contact.email}
                      </Text>
                    </Box>
                  )}
                  {data.delivery_partner_contact && (
                    <Box>
                      <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                        DELIVERY PARTNER
                      </Text>
                      <Text fontWeight="500">
                        {data.delivery_partner_contact.full_name || "N/A"}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {data.delivery_partner_contact.email}
                      </Text>
                    </Box>
                  )}
                </HStack>
              </Box>
            )}

            {/* Delivery Address */}
            {deliveryAddress?.street_address && (
              <Box w="100%" pt={4} borderTopWidth="1px">
                <Text fontSize="xs" color="fg.subtle" fontWeight="600">
                  DELIVERY ADDRESS
                </Text>
                <Text fontWeight="500" lineClamp={2}>
                  {deliveryAddress.street_address}
                </Text>
              </Box>
            )}
          </VStack>
        </Box>

        {/* Action Buttons */}
        {actionHints && canAct && (
          <HStack gap={3} flexWrap="wrap">
            {actionHints.next_status && (
              <Button
                colorPalette="cyan"
                onClick={() =>
                  handleAdvance(actionHints.next_status as OrderStatus)
                }
                loading={updateStatusMutation.isPending}
              >
                Mark as{" "}
                {humanizeStatus(
                  actionHints.next_status_label || actionHints.next_status,
                )}
              </Button>
            )}
            {actionHints.can_cancel && (
              <Button
                variant="outline"
                colorPalette="red"
                onClick={() => handleAdvance("cancelled")}
                disabled={updateStatusMutation.isPending}
              >
                Cancel Order
              </Button>
            )}
          </HStack>
        )}

        {/* Items Section - Hidden for delivery partners */}
        {activeRole !== "delivery_partner" && (
          <Box w="100%">
            <Heading size="md" mb={4}>
              Order Items ({data.items?.length || 0})
            </Heading>
            <Wrap gap={4}>
              {data.items?.map((it: OrderItemPublic) => (
                <WrapItem key={it.id} minW="280px" maxW="400px" flex="1">
                  <Box
                    borderWidth="1px"
                    rounded="lg"
                    bg="bg.surface"
                    w="100%"
                    _hover={{ borderColor: "brand.primary", shadow: "md" }}
                    transition="all 0.2s"
                  >
                    <HStack gap={3} align="flex-start" p={4}>
                      <Image
                        boxSize="80px"
                        rounded="md"
                        objectFit="cover"
                        src={resolveImage(it.image_path)}
                        alt={it.product_name}
                        flexShrink={0}
                      />
                      <Stack flex={1} gap={2} minW={0}>
                        <Text fontWeight="600" lineClamp={2} fontSize="sm">
                          {it.product_name}
                        </Text>
                        <Text
                          fontWeight="700"
                          fontSize="lg"
                          color="brand.primary"
                        >
                          {formatCurrency(it.price_paid)}
                        </Text>
                        <Badge
                          size="xs"
                          colorPalette="cyan"
                          alignSelf="flex-start"
                        >
                          Qty: {it.quantity}
                        </Badge>
                      </Stack>
                    </HStack>
                    <HStack gap={2} px={4} pb={4} flexWrap="wrap">
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="cyan"
                        asChild
                      >
                        <Link
                          to="/buy/$productId"
                          params={{ productId: it.product_id }}
                        >
                          View Product
                        </Link>
                      </Button>
                      {enableClone && it.product_id && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            if (cloneMutation.isPending) return
                            cloneMutation.mutate(it.id, {
                              onSuccess: (newProd) => {
                                const newId =
                                  (newProd as any)?.id ||
                                  (newProd as any)?.product?.id
                                if (newId) {
                                  navigate({
                                    to: "/sell/$productId",
                                    params: { productId: newId },
                                    search: { cloned: "1" },
                                  })
                                }
                              },
                            })
                          }}
                          loading={cloneMutation.isPending}
                        >
                          Clone to Store
                        </Button>
                      )}
                    </HStack>
                  </Box>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
        )}

        {/* Order History */}
        {data.history && data.history.length > 0 && (
          <Box w="100%" pt={6} borderTopWidth="1px">
            <Heading size="md" mb={6}>
              Order Timeline
            </Heading>
            <OrderTimeline history={data.history} />
          </Box>
        )}
      </VStack>
    </PageContainer>
  )
}
