import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Image,
  SimpleGrid,
  Spinner,
  Stack,
  Tabs,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { FiChevronRight, FiPackage } from "react-icons/fi"
import { OrdersService } from "@/client"
import type { OrderPublic, OrdersPublic } from "@/client/types.gen"
import { PageContainer } from "@/components/Common/PageContainer"
import { OrderStatusBadge } from "@/components/Orders/OrderStatusBadge"
import useAuth from "@/hooks/useAuth"
import useCloneProduct from "@/hooks/useCloneProduct"
import { getPlaceholderImageUrl, getProductImageUrl } from "@/utils/images"

export const Route = createFileRoute("/_layout/orders/me")({
  component: OrdersMePage,
})

function OrdersMePage() {
  const navigate = useNavigate()
  const { activeRole } = useAuth()
  const cloneMutation = useCloneProduct()
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
    enableClone = false,
  }: {
    orders?: OrderPublic[]
    isLoading: boolean
    emptyMessage: string
    showBuyerInfo?: boolean
    enableClone?: boolean
  }) => {
    if (isLoading) {
      return (
        <VStack py={20} gap={4}>
          <Spinner size="xl" />
          <Text color="fg.muted">Loading orders...</Text>
        </VStack>
      )
    }
    if (!orders || orders.length === 0) {
      return (
        <VStack py={20} gap={4} align="center">
          <Icon as={FiPackage} fontSize="4xl" color="fg.muted" />
          <Heading size="md" color="fg.muted">
            {emptyMessage}
          </Heading>
        </VStack>
      )
    }
    return (
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6}>
        {orders.map((o) => (
          <Box
            key={o.id}
            borderWidth="1px"
            borderColor="border.default"
            rounded="xl"
            p={6}
            bg="bg.surface"
            _hover={{
              shadow: "lg",
              borderColor: "brand.primary",
              transform: "translateY(-2px)",
            }}
            transition="all 0.3s ease"
            cursor="pointer"
            onClick={() =>
              navigate({
                to: "/orders/$orderId",
                params: { orderId: o.id },
              })
            }
          >
            <HStack justify="space-between" align="flex-start" mb={4}>
              <VStack align="start" gap={1}>
                <Heading size="sm">{o.order_number}</Heading>
                <Text fontSize="sm" color="fg.muted">
                  {new Date(o.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </VStack>
              <OrderStatusBadge status={o.order_status} />
            </HStack>

            <SimpleGrid
              columns={{ base: 2, md: 3 }}
              gap={6}
              mb={4}
              pb={4}
              borderBottomWidth="1px"
              borderBottomColor="border.default"
            >
              <Box>
                <Text fontSize="xs" color="fg.subtle" fontWeight="600" mb={1}>
                  TOTAL AMOUNT
                </Text>
                <Text fontSize="xl" fontWeight="700" color="brand.primary">
                  ₹{o.order_total}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="fg.subtle" fontWeight="600" mb={1}>
                  ITEMS
                </Text>
                <HStack gap={1}>
                  <Icon as={FiPackage} color="fg.muted" />
                  <Text fontSize="lg" fontWeight="600">
                    {o.items?.length || 0}
                  </Text>
                </HStack>
              </Box>
            </SimpleGrid>

            {/* Contact Information */}
            {(o.seller_contact ||
              o.buyer_contact ||
              o.delivery_partner_contact) && (
              <HStack gap={6} fontSize="sm" flexWrap="wrap" mb={4}>
                {o.seller_contact && !showBuyerInfo && (
                  <Box>
                    <Text
                      fontSize="xs"
                      color="fg.subtle"
                      fontWeight="600"
                      mb={1}
                    >
                      SELLER
                    </Text>
                    <Text fontWeight="500">
                      {o.seller_contact.full_name || o.seller_contact.email}
                    </Text>
                  </Box>
                )}
                {o.buyer_contact && showBuyerInfo && (
                  <Box>
                    <Text
                      fontSize="xs"
                      color="fg.subtle"
                      fontWeight="600"
                      mb={1}
                    >
                      BUYER
                    </Text>
                    <Text fontWeight="500">
                      {o.buyer_contact.full_name || o.buyer_contact.email}
                    </Text>
                  </Box>
                )}
                {o.delivery_partner_contact && (
                  <Box>
                    <Text
                      fontSize="xs"
                      color="fg.subtle"
                      fontWeight="600"
                      mb={1}
                    >
                      DELIVERY PARTNER
                    </Text>
                    <Text fontWeight="500">
                      {o.delivery_partner_contact.full_name ||
                        o.delivery_partner_contact.email}
                    </Text>
                  </Box>
                )}
              </HStack>
            )}
            {o.items && o.items.length > 0 && (
              <Box>
                <Text fontSize="xs" color="fg.subtle" fontWeight="600" mb={3}>
                  ORDER ITEMS{" "}
                  {o.items.length > 3 && `(Showing 3 of ${o.items.length})`}
                </Text>
                <Wrap gap={4}>
                  {o.items.slice(0, 3).map((item) => (
                    <WrapItem key={item.id} minW="240px">
                      <HStack
                        gap={3}
                        align="flex-start"
                        p={3}
                        bg="bg.subtle"
                        rounded="md"
                        w="100%"
                      >
                        <Image
                          boxSize="60px"
                          rounded="md"
                          objectFit="cover"
                          src={resolveImage(item.image_path)}
                          alt={item.product_name}
                          flexShrink={0}
                        />
                        <Stack gap={1} flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="600" lineClamp={2}>
                            {item.product_name}
                          </Text>
                          <HStack gap={2} fontSize="xs" color="fg.muted">
                            <Badge size="xs" colorPalette="cyan">
                              Qty: {item.quantity}
                            </Badge>
                          </HStack>
                          <HStack gap={2} fontSize="xs" flexWrap="wrap">
                            <Link
                              to="/buy/$productId"
                              params={{ productId: item.product_id }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: "var(--chakra-colors-brand-primary)",
                              }}
                            >
                              View Product
                            </Link>
                            {enableClone &&
                              item.product_id &&
                              o.order_status === "delivered" && (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (cloneMutation.isPending) return
                                    cloneMutation.mutate(item.id, {
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
                                  Clone
                                </Button>
                              )}
                          </HStack>
                        </Stack>
                      </HStack>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            )}
            <HStack
              justify="flex-end"
              fontSize="sm"
              color="brand.primary"
              fontWeight="600"
              pt={4}
            >
              <Text>View Full Details</Text>
              <Icon as={FiChevronRight} />
            </HStack>
          </Box>
        ))}
      </SimpleGrid>
    )
  }

  return (
    <PageContainer variant="list">
      <VStack align="start" gap={8} w="100%">
        <Box>
          <Heading size="xl" mb={2}>
            {isRetailer
              ? "Orders"
              : isWholesaler
                ? "Received Orders"
                : "My Orders"}
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            Track and manage your orders
          </Text>
        </Box>

        {isRetailer ? (
          <Box w="100%">
            <Tabs.Root defaultValue="received" w="100%">
              <Tabs.List
                bg="transparent"
                borderBottomWidth="2px"
                borderColor="border.default"
                rounded="none"
                mb={6}
                gap={4}
              >
                <Tabs.Trigger
                  value="received"
                  px={4}
                  py={3}
                  borderBottomWidth="3px"
                  borderColor="transparent"
                  rounded="none"
                  _selected={{
                    borderColor: "brand.primary",
                    color: "brand.primary",
                    fontWeight: "600",
                    bg: "transparent",
                  }}
                  _hover={{
                    bg: "bg.subtle",
                  }}
                  transition="all 0.2s"
                >
                  <HStack gap={2}>
                    <Text>Received Orders</Text>
                    <Badge
                      colorPalette="blue"
                      size="sm"
                      variant="solid"
                      borderRadius="full"
                      px={2}
                    >
                      {sellerOrders?.count ?? 0}
                    </Badge>
                  </HStack>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="placed"
                  px={4}
                  py={3}
                  borderBottomWidth="3px"
                  borderColor="transparent"
                  rounded="none"
                  _selected={{
                    borderColor: "brand.primary",
                    color: "brand.primary",
                    fontWeight: "600",
                    bg: "transparent",
                  }}
                  _hover={{
                    bg: "bg.subtle",
                  }}
                  transition="all 0.2s"
                >
                  <HStack gap={2}>
                    <Text>Placed Orders</Text>
                    <Badge
                      colorPalette="cyan"
                      size="sm"
                      variant="solid"
                      borderRadius="full"
                      px={2}
                    >
                      {buyerOrders?.count ?? 0}
                    </Badge>
                  </HStack>
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
                  enableClone={true}
                />
              </Tabs.Content>
            </Tabs.Root>
          </Box>
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
      </VStack>
    </PageContainer>
  )
}
