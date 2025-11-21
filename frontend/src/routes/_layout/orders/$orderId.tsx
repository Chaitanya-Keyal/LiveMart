import {
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Separator,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { OrdersService } from "@/client"
import type {
  OrderActionHints,
  OrderItemPublic,
  OrderPublic,
  OrderStatus,
} from "@/client/types.gen"
import { OrderStatusBadge } from "@/components/Orders/OrderStatusBadge"
import { OrderTimeline } from "@/components/Orders/OrderTimeline"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { getPlaceholderImageUrl, getProductImageUrl } from "@/utils/images"

export const Route = createFileRoute("/_layout/orders/$orderId")({
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const { activeRole } = useAuth()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

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

  if (isLoading) return <Spinner />
  if (!data) return <Text>Not found</Text>

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

  return (
    <Stack mt={6} gap={6}>
      <Stack borderWidth="1px" rounded="lg" p={4} gap={3} bg="bg.surface">
        <HStack
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
        >
          <Stack gap={0}>
            <Heading size="md">Order {data.order_number}</Heading>
            <Text fontSize="sm" color="fg.muted">
              Placed on {placedDate}
            </Text>
          </Stack>
          <OrderStatusBadge status={data.order_status} />
        </HStack>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} fontSize="sm">
          <Box>
            <Text color="fg.muted">Subtotal</Text>
            <Text fontWeight="semibold">
              {formatCurrency(data.order_subtotal)}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Delivery Fee</Text>
            <Text fontWeight="semibold">
              {formatCurrency(data.delivery_fee)}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Grand Total</Text>
            <Text fontWeight="semibold">
              {formatCurrency(data.order_total)}
            </Text>
          </Box>
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} fontSize="sm">
          <Box>
            <Text color="fg.muted">Total Items</Text>
            <Text fontWeight="semibold">{totalItems}</Text>
          </Box>
          {data.seller_contact && (
            <Box>
              <Text color="fg.muted">Seller</Text>
              <Text fontWeight="semibold">
                {data.seller_contact.full_name || "N/A"}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {data.seller_contact.email}
              </Text>
            </Box>
          )}
          {data.buyer_contact && activeRole !== "customer" && (
            <Box>
              <Text color="fg.muted">Buyer</Text>
              <Text fontWeight="semibold">
                {data.buyer_contact.full_name || "N/A"}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {data.buyer_contact.email}
              </Text>
            </Box>
          )}
          {data.delivery_partner_contact && (
            <Box>
              <Text color="fg.muted">Delivery Partner</Text>
              <Text fontWeight="semibold">
                {data.delivery_partner_contact.full_name || "N/A"}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {data.delivery_partner_contact.email}
              </Text>
            </Box>
          )}
        </SimpleGrid>
        {deliveryAddress?.street_address && (
          <Box>
            <Text color="fg.muted" fontSize="sm">
              Deliver To
            </Text>
            <Text fontWeight="semibold" fontSize="sm" lineClamp={2}>
              {deliveryAddress.street_address}
            </Text>
          </Box>
        )}
      </Stack>

      {actionHints && canAct && (
        <HStack gap={3} flexWrap="wrap">
          {actionHints.next_status && (
            <Button
              colorPalette="teal"
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

      <Stack gap={4}>
        <Heading size="sm">Items</Heading>
        <Stack gap={3}>
          {data.items?.map((it: OrderItemPublic) => (
            <HStack
              key={it.id}
              borderWidth="1px"
              rounded="lg"
              p={3}
              align="flex-start"
              gap={4}
            >
              <Image
                boxSize="80px"
                rounded="md"
                objectFit="cover"
                src={resolveImage(it.image_path)}
                alt={it.product_name}
              />
              <Stack flex={1} gap={1} minW={0}>
                <HStack justify="space-between" align="flex-start">
                  <Text fontWeight="semibold" lineClamp={1}>
                    {it.product_name}
                  </Text>
                  <Text fontWeight="semibold">
                    {formatCurrency(it.price_paid)}
                  </Text>
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  Qty x{it.quantity}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  alignSelf="flex-start"
                  asChild
                >
                  <Link
                    to="/buy/$productId"
                    params={{ productId: it.product_id }}
                  >
                    View Product
                  </Link>
                </Button>
              </Stack>
            </HStack>
          ))}
        </Stack>
      </Stack>

      <Separator />
      {data.history && data.history.length > 0 && (
        <>
          <Heading size="sm">Order History</Heading>
          <OrderTimeline history={data.history} />
        </>
      )}
    </Stack>
  )
}
