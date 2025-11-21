import {
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Image,
  Skeleton,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import useAuth from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import useCustomToast from "@/hooks/useCustomToast"
import useProductsByIds from "@/hooks/useProductsByIds"
import { getPrimaryImageUrl } from "@/utils/images"

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

  if (cartQuery.isLoading) return <Spinner mt={10} />
  if (!cart || !cart.items?.length) {
    return (
      <Stack mt={10} gap={4} align="center">
        <Heading size="md">Your cart is empty</Heading>
        <Text fontSize="sm">Browse products to add items.</Text>
        <Button onClick={() => navigate({ to: "/" })}>Go Home</Button>
      </Stack>
    )
  }

  return (
    <Stack gap={8} mt={6}>
      <Heading size="md">Cart</Heading>
      <Stack gap={4}>
        {(cart.items || []).map((it) => {
          const product = productsMap[it.product_id]
          return (
            <HStack
              key={it.id}
              justify="space-between"
              borderWidth="1px"
              rounded="md"
              p={3}
              gap={4}
            >
              <HStack gap={4} flex={1} align="stretch">
                <Box
                  boxSize="60px"
                  bg="gray.100"
                  overflow="hidden"
                  rounded="md"
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
                      src={"https://via.placeholder.com/120?text=No+Image"}
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
                    <Text fontWeight="semibold" color="gray.500">
                      Loading...
                    </Text>
                  )}
                  <Text fontSize="xs" color="gray.600">
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
      <HStack>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            clearCart.mutate(undefined, {
              onSuccess: () => showSuccessToast("Cart cleared"),
              onError: (e: any) => showErrorToast(e?.message || "Clear failed"),
            })
          }
        >
          Clear Cart
        </Button>
        <Button
          size="sm"
          colorScheme="teal"
          onClick={() => navigate({ to: "/checkout" })}
        >
          Checkout
        </Button>
      </HStack>
    </Stack>
  )
}
