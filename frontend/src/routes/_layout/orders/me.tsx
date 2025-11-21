import {
  Box,
  Heading,
  HStack,
  Icon,
  Image,
  SimpleGrid,
  Spinner,
  Stack,
  Tabs,
  Text,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { FiChevronRight } from "react-icons/fi"
import { OrdersService } from "@/client"
import type { OrderPublic, OrdersPublic } from "@/client/types.gen"
import { OrderStatusBadge } from "@/components/Orders/OrderStatusBadge"
import useAuth from "@/hooks/useAuth"
import { getPlaceholderImageUrl, getProductImageUrl } from "@/utils/images"

export const Route = createFileRoute("/_layout/orders/me")({
  component: OrdersMePage,
})

function OrdersMePage() {
  const navigate = useNavigate()
  const { activeRole } = useAuth()
  const isRetailer = activeRole === "retailer"
  const isWholesaler = activeRole === "wholesaler"
  const isSeller = isRetailer || isWholesaler

  const { data: buyerOrders, isLoading: buyerLoading } = useQuery<OrdersPublic>(
    {
      queryKey: ["orders", "me"],
      enabled: !isSeller || isRetailer,
      queryFn: () => OrdersService.myOrders().then((r) => r as OrdersPublic),
    },
  )

  const { data: sellerOrders, isLoading: sellerLoading } =
    useQuery<OrdersPublic>({
      queryKey: ["orders", "seller"],
      enabled: isSeller,
      queryFn: () =>
        OrdersService.sellerOrders().then((r) => r as OrdersPublic),
    })

  const resolveImage = (path?: string | null) =>
    path ? getProductImageUrl(path) : getPlaceholderImageUrl()

  const OrdersList = ({
    orders,
    isLoading,
    emptyMessage,
    showBuyerInfo = false,
  }: {
    orders?: OrderPublic[]
    isLoading: boolean
    emptyMessage: string
    showBuyerInfo?: boolean
  }) => {
    if (isLoading) {
      return <Spinner />
    }
    if (!orders || orders.length === 0) {
      return <Text>{emptyMessage}</Text>
    }
    return (
      <Stack gap={4}>
        {orders.map((o) => (
          <Stack
            key={o.id}
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
                params: { orderId: o.id },
              })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                navigate({
                  to: "/orders/$orderId",
                  params: { orderId: o.id },
                })
              }
            }}
          >
            <HStack justify="space-between" align="flex-start">
              <Stack gap={0}>
                <Text fontWeight="semibold">{o.order_number}</Text>
                <Text fontSize="xs" color="fg.muted">
                  Placed on {new Date(o.created_at).toLocaleDateString()}
                </Text>
              </Stack>
              <OrderStatusBadge status={o.order_status} />
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} fontSize="sm">
              <Box>
                <Text color="fg.muted">Total</Text>
                <Text fontWeight="semibold">₹{o.order_total}</Text>
              </Box>
              <Box>
                <Text color="fg.muted">Items</Text>
                <Text fontWeight="semibold">{o.items?.length || 0}</Text>
              </Box>
            </SimpleGrid>

            {/* Contact Information */}
            <HStack gap={4} fontSize="sm" flexWrap="wrap">
              {o.seller_contact && !showBuyerInfo && (
                <Box>
                  <Text color="fg.muted" fontSize="xs">
                    Seller
                  </Text>
                  <Text fontWeight="medium">
                    {o.seller_contact.full_name || o.seller_contact.email}
                  </Text>
                </Box>
              )}
              {o.buyer_contact && showBuyerInfo && (
                <Box>
                  <Text color="fg.muted" fontSize="xs">
                    Buyer
                  </Text>
                  <Text fontWeight="medium">
                    {o.buyer_contact.full_name || o.buyer_contact.email}
                  </Text>
                </Box>
              )}
              {o.delivery_partner_contact && (
                <Box>
                  <Text color="fg.muted" fontSize="xs">
                    Delivery Partner
                  </Text>
                  <Text fontWeight="medium">
                    {o.delivery_partner_contact.full_name ||
                      o.delivery_partner_contact.email}
                  </Text>
                </Box>
              )}
            </HStack>
            {o.items && o.items.length > 0 && (
              <Wrap gap={4}>
                {o.items.slice(0, 3).map((item) => (
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
                        <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                          {item.product_name}
                        </Text>
                        <HStack gap={2} fontSize="xs" color="fg.muted">
                          <Text>x{item.quantity}</Text>
                          <Link
                            to="/buy/$productId"
                            params={{ productId: item.product_id }}
                            onClick={(e) => e.stopPropagation()}
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
            <HStack justify="flex-end" fontSize="sm" color="fg.muted">
              <Text>View details</Text>
              <Icon as={FiChevronRight} />
            </HStack>
          </Stack>
        ))}
      </Stack>
    )
  }

  return (
    <Stack mt={6} gap={6}>
      <Heading size="md">
        {isRetailer ? "Orders" : isWholesaler ? "Received Orders" : "My Orders"}
      </Heading>
      {isRetailer ? (
        <Tabs.Root defaultValue="received" variant="enclosed">
          <Tabs.List>
            <Tabs.Trigger value="received">
              Received ({sellerOrders?.count ?? 0})
            </Tabs.Trigger>
            <Tabs.Trigger value="placed">
              Placed ({buyerOrders?.count ?? 0})
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="received">
            <OrdersList
              orders={sellerOrders?.data}
              isLoading={sellerLoading}
              emptyMessage="No received orders yet."
              showBuyerInfo
            />
          </Tabs.Content>
          <Tabs.Content value="placed">
            <OrdersList
              orders={buyerOrders?.data}
              isLoading={buyerLoading}
              emptyMessage="No placed orders yet."
            />
          </Tabs.Content>
        </Tabs.Root>
      ) : isWholesaler ? (
        <OrdersList
          orders={sellerOrders?.data}
          isLoading={sellerLoading}
          emptyMessage="No received orders yet."
          showBuyerInfo
        />
      ) : (
        <OrdersList
          orders={buyerOrders?.data}
          isLoading={buyerLoading}
          emptyMessage="No orders yet."
        />
      )}
    </Stack>
  )
}
