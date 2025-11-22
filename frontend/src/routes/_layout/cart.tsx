import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Image,
  Skeleton,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { PageContainer } from "@/components/Common/PageContainer"
import useAuth from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import useCustomToast from "@/hooks/useCustomToast"
import useProductsByIds from "@/hooks/useProductsByIds"
import { getPlaceholderImageUrl, getPrimaryImageUrl } from "@/utils/images"

export const Route = createFileRoute("/_layout/cart")({
  component: CartPage,
})

function CartPage() {
  const { cartQuery, updateItem, removeItem, clearCart } = useCart()
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { activeRole } = useAuth()

  const cart = cartQuery.data
  const productIds = (cart?.items || []).map((i) => i.product_id)
  const { productsMap, loading: productsLoading } = useProductsByIds(productIds)

  const handleQty = (itemId: string, productId: string, next: number) => {
    const product = productsMap[productId]
    // Determine buyer type
    const buyerType = activeRole === "retailer" ? "retailer" : "customer"
    const tier =
      product?.pricing_tiers?.find(
        (t) => t.buyer_type === buyerType && t.is_active,
      ) ||
      product?.pricing_tiers?.find(
        (t) => t.buyer_type === "customer" && t.is_active,
      )
    const minQ = tier?.min_quantity || 1
    const maxQ = tier?.max_quantity || undefined
    // Clamp desired quantity
    let desired = Math.max(minQ, next)
    if (maxQ !== undefined) desired = Math.min(desired, maxQ)

    // Clamp against stock
    if (product?.inventory?.stock_quantity !== undefined) {
      desired = Math.min(desired, product.inventory.stock_quantity)
    }

    updateItem.mutate(
      { id: itemId, quantity: desired },
      {
        onError: (e: any) => showErrorToast(e?.message || "Update failed"),
      },
    )
  }

  if (cartQuery.isLoading) {
    return (
      <PageContainer variant="narrow">
        <Stack align="center" py={20}>
          <Spinner size="xl" />
          <Text color="fg.muted">Loading your cart...</Text>
        </Stack>
      </PageContainer>
    )
  }
  if (!cart || !cart.items?.length) {
    return (
      <PageContainer variant="narrow">
        <VStack gap={8} py={20} align="center">
          <Box fontSize="6xl">🛒</Box>
          <VStack gap={3}>
            <Heading size="xl">Your cart is empty</Heading>
            <Text color="fg.muted" fontSize="lg" textAlign="center">
              Browse products to add items to your cart.
            </Text>
          </VStack>
          <Button size="lg" onClick={() => navigate({ to: "/buy" })}>
            Start Shopping
          </Button>
        </VStack>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="narrow">
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="xl" mb={2}>
            Shopping Cart
          </Heading>
          <Text color="fg.muted">
            {cart.items.length} item{cart.items.length !== 1 ? "s" : ""} in your
            cart
          </Text>
        </Box>
        <Stack gap={4}>
          {(cart.items || []).map((it) => {
            const product = productsMap[it.product_id]
            return (
              <HStack
                key={it.id}
                justify="space-between"
                borderWidth="1px"
                borderColor="border.default"
                rounded="lg"
                p={4}
                gap={4}
                bg="bg.surface"
                _hover={{ borderColor: "border.strong", shadow: "sm" }}
                transition="all 0.2s"
              >
                <HStack gap={4} flex={1} align="stretch">
                  <Box
                    boxSize="80px"
                    bg="bg.subtle"
                    overflow="hidden"
                    rounded="md"
                    flexShrink={0}
                  >
                    {productsLoading && !product ? (
                      <Skeleton w="100%" h="100%" />
                    ) : product?.images?.length ? (
                      <Image
                        src={getPrimaryImageUrl(product)}
                        alt={product.name}
                        w="100%"
                        h="100%"
                        objectFit="cover"
                      />
                    ) : (
                      <Image
                        src={getPlaceholderImageUrl()}
                        alt="No image"
                        w="100%"
                        h="100%"
                        objectFit="cover"
                      />
                    )}
                  </Box>
                  <Stack gap={1} flex={1} minW={0}>
                    {product ? (
                      <Link
                        to="/buy/$productId"
                        params={{ productId: product.id }}
                        style={{ fontWeight: 600 }}
                      >
                        {product.name}
                      </Link>
                    ) : (
                      <Text fontWeight="semibold" color="fg.muted">
                        Loading...
                      </Text>
                    )}
                    <Text fontSize="xs" color="fg.muted">
                      Qty: {it.quantity}
                    </Text>
                  </Stack>
                </HStack>
                <HStack gap={2}>
                  <HStack>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        handleQty(it.id, it.product_id, it.quantity - 1)
                      }
                      disabled={(() => {
                        const product = productsMap[it.product_id]
                        const buyerType =
                          activeRole === "retailer" ? "retailer" : "customer"
                        const tier =
                          product?.pricing_tiers?.find(
                            (t) => t.buyer_type === buyerType && t.is_active,
                          ) ||
                          product?.pricing_tiers?.find(
                            (t) => t.buyer_type === "customer" && t.is_active,
                          )
                        const minQ = tier?.min_quantity || 1
                        return it.quantity <= minQ
                      })()}
                    >
                      -
                    </Button>
                    <Text fontSize="sm" minW="24px" textAlign="center">
                      {it.quantity}
                    </Text>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        handleQty(it.id, it.product_id, it.quantity + 1)
                      }
                      disabled={(() => {
                        const product = productsMap[it.product_id]
                        const buyerType =
                          activeRole === "retailer" ? "retailer" : "customer"
                        const tier =
                          product?.pricing_tiers?.find(
                            (t) => t.buyer_type === buyerType && t.is_active,
                          ) ||
                          product?.pricing_tiers?.find(
                            (t) => t.buyer_type === "customer" && t.is_active,
                          )

                        // Check stock limit
                        const stock = product?.inventory?.stock_quantity ?? 0
                        if (it.quantity >= stock) return true

                        const maxQ = tier?.max_quantity
                        if (maxQ == null) return false
                        return it.quantity >= maxQ
                      })()}
                    >
                      +
                    </Button>
                  </HStack>
                  <IconButton
                    aria-label="Remove"
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      removeItem.mutate(it.id, {
                        onError: (e: any) =>
                          showErrorToast(e?.message || "Remove failed"),
                      })
                    }
                  >
                    ✕
                  </IconButton>
                </HStack>
              </HStack>
            )
          })}
        </Stack>
        <Flex
          justify="space-between"
          align="center"
          pt={4}
          borderTopWidth="2px"
          borderTopColor="border.default"
        >
          <Button
            size="md"
            variant="ghost"
            onClick={() =>
              clearCart.mutate(undefined, {
                onSuccess: () => showSuccessToast("Cart cleared"),
                onError: (e: any) =>
                  showErrorToast(e?.message || "Clear failed"),
              })
            }
          >
            Clear Cart
          </Button>
          <Button size="lg" onClick={() => navigate({ to: "/checkout" })}>
            Proceed to Checkout →
          </Button>
        </Flex>
      </VStack>
    </PageContainer>
  )
}
