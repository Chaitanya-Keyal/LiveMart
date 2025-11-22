import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  NumberInput,
  Separator,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import React from "react"
import { CartService, type ProductPublic } from "@/client"
import { PageContainer } from "@/components/Common/PageContainer"
import useAuth from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import useCustomToast from "@/hooks/useCustomToast"
import { formatPrice } from "@/utils"
import {
  getAllProductImageUrls,
  getPlaceholderImageUrl,
  getPrimaryImageUrl,
} from "@/utils/images"
import { ProductReviewsSection } from "./ProductReviewsSection"
import { StarRating } from "./StarRating"

interface ProductDetailProps {
  product: ProductPublic
}

const getCategoryLabel = (category: string): string => {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export const ProductDetail = ({ product }: ProductDetailProps) => {
  const { activeRole } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  // Determine buyer type based on active role
  const buyerType = activeRole === "retailer" ? "retailer" : "customer"
  const addToCartMutation = useMutation({
    mutationFn: ({ productId, qty }: { productId: string; qty: number }) =>
      CartService.addItem({
        requestBody: { product_id: productId, quantity: qty },
      }),
    onSuccess: () => {
      showSuccessToast("Added to cart")
      queryClient.invalidateQueries({ queryKey: ["cart"] })
      // Recalculate existing and reset quantity to next required min
      const newExisting = existingInCart + quantity
      const nextRequired =
        newExisting >= minQuantity ? 1 : Math.max(minQuantity - newExisting, 1)
      setQuantity(nextRequired)
    },
    onError: (err: any) => {
      const message =
        err?.body?.detail || err?.message || "Failed to add to cart"
      showErrorToast(message)
    },
  })

  const handleAddToCart = () => {
    const resultingTotal = existingInCart + quantity
    if (resultingTotal < minQuantity) {
      showErrorToast(
        `You need at least total ${minQuantity}. Add ${minQuantity - existingInCart} or more.`,
      )
      return
    }
    if (maxQuantity && resultingTotal > maxQuantity) {
      showErrorToast(`Max total ${maxQuantity}. Reduce added amount.`)
      return
    }
    if (quantity > stockQuantity - existingInCart) {
      showErrorToast("Exceeds available stock")
      return
    }
    addToCartMutation.mutate({ productId: product.id, qty: quantity })
  }

  // Get pricing tier for current buyer type
  const pricingTier = product.pricing_tiers?.find(
    (tier) => tier.buyer_type === buyerType && tier.is_active,
  )

  // Fallback to customer pricing if retailer pricing not available
  const displayPricing =
    pricingTier ||
    product.pricing_tiers?.find(
      (tier) => tier.buyer_type === "customer" && tier.is_active,
    )

  const price = displayPricing?.price || "0"
  const minQuantity = displayPricing?.min_quantity || 1
  const maxQuantity = displayPricing?.max_quantity
  const { cartQuery } = useCart()
  const existingInCart =
    (cartQuery.data?.items || []).find((i) => i.product_id === product.id)
      ?.quantity || 0
  const requiredMinForAdd =
    existingInCart >= minQuantity
      ? 1
      : Math.max(minQuantity - existingInCart, 1)
  const remainingMax = maxQuantity
    ? Math.max(0, maxQuantity - existingInCart)
    : undefined
  const [quantity, setQuantity] = React.useState(requiredMinForAdd)

  const imageUrls = getAllProductImageUrls(product)
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0)

  const stockQuantity = product.inventory?.stock_quantity || 0
  const lowStockThreshold = product.inventory?.low_stock_threshold || 10
  const isInStock = stockQuantity > 0
  const isLowStock = stockQuantity > 0 && stockQuantity < lowStockThreshold

  return (
    <PageContainer variant="detail">
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={10}>
        {/* Image Gallery */}
        <Box>
          <Box
            w="100%"
            aspectRatio="1"
            mb={4}
            borderRadius="md"
            overflow="hidden"
            bg="bg.subtle"
          >
            <Image
              src={imageUrls[selectedImageIndex] || getPrimaryImageUrl(product)}
              alt={product.name}
              w="100%"
              h="100%"
              objectFit="cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = getPlaceholderImageUrl()
              }}
            />
          </Box>
          {imageUrls.length > 1 && (
            <SimpleGrid columns={4} gap={2}>
              {imageUrls.map((url, index) => (
                <Box
                  key={index}
                  aspectRatio="1"
                  borderRadius="md"
                  overflow="hidden"
                  cursor="pointer"
                  borderWidth={selectedImageIndex === index ? 2 : 1}
                  borderColor={
                    selectedImageIndex === index
                      ? "brand.primary"
                      : "border.default"
                  }
                  onClick={() => setSelectedImageIndex(index)}
                  _hover={{ borderColor: "brand.accent" }}
                >
                  <Image
                    src={url}
                    alt={`${product.name} - Image ${index + 1}`}
                    w="100%"
                    h="100%"
                    objectFit="cover"
                  />
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>

        {/* Product Info */}
        <VStack align="stretch" gap={4}>
          <Box>
            <Flex gap={2} mb={2} flexWrap="wrap">
              <Badge colorPalette="cyan" variant="subtle">
                {getCategoryLabel(product.category)}
              </Badge>
              {product.tags?.includes("local") && (
                <Badge colorPalette="green" variant="solid">
                  Local Product
                </Badge>
              )}
              {product.tags?.includes("featured") && (
                <Badge colorPalette="purple" variant="solid">
                  Featured
                </Badge>
              )}
              {!product.is_active && (
                <Badge colorPalette="gray" variant="solid">
                  Unavailable
                </Badge>
              )}
            </Flex>
            <Heading size="xl" mb={2}>
              {product.name}
            </Heading>
            {product.average_rating !== null &&
              product.average_rating !== undefined && (
                <Box mb={2}>
                  <StarRating
                    value={product.average_rating}
                    count={product.review_count}
                    size="md"
                    showCount
                  />
                </Box>
              )}
            {product.description && (
              <Text color="fg.muted" fontSize="md">
                {product.description}
              </Text>
            )}
          </Box>

          <Separator />

          <Box>
            <Text fontSize="3xl" fontWeight="bold" color="brand.primary" mb={2}>
              {formatPrice(price)}
            </Text>
            {minQuantity > 1 && (
              <Text fontSize="sm" color="fg.muted">
                Minimum quantity: {minQuantity}
                {maxQuantity && ` (max: ${maxQuantity})`}
              </Text>
            )}
          </Box>

          <Box>
            <Text fontWeight="semibold" mb={2}>
              Stock Status:
            </Text>
            {isInStock ? (
              <Text color={isLowStock ? "orange.500" : "green.600"}>
                {isLowStock
                  ? `Low Stock (${stockQuantity} remaining)`
                  : `In Stock (${stockQuantity} available)`}
              </Text>
            ) : (
              <Text color="red.500">Out of Stock</Text>
            )}
          </Box>

          {product.sku && (
            <Box>
              <Text fontWeight="semibold" mb={1}>
                SKU:
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {product.sku}
              </Text>
            </Box>
          )}

          {product.tags && product.tags.length > 0 && (
            <Box>
              <Text fontWeight="semibold" mb={2}>
                Tags:
              </Text>
              <Flex gap={2} flexWrap="wrap">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="outline" fontSize="sm">
                    {tag}
                  </Badge>
                ))}
              </Flex>
            </Box>
          )}

          <Separator />

          <VStack align="stretch" gap={3}>
            <Box>
              <Text fontWeight="semibold" mb={2}>
                Quantity:
              </Text>
              <HStack gap={2}>
                <Button
                  size="sm"
                  onClick={() =>
                    setQuantity(Math.max(requiredMinForAdd, quantity - 1))
                  }
                  disabled={quantity <= requiredMinForAdd}
                >
                  -
                </Button>
                <NumberInput.Root
                  value={String(quantity)}
                  min={minQuantity}
                  max={maxQuantity || stockQuantity}
                  onValueChange={(e) => setQuantity(Number(e.value))}
                  w="100px"
                >
                  <NumberInput.Input />
                </NumberInput.Root>
                <Button
                  size="sm"
                  onClick={() => {
                    const stockRemaining = stockQuantity - existingInCart
                    const cap =
                      remainingMax !== undefined
                        ? Math.min(remainingMax, stockRemaining)
                        : stockRemaining
                    setQuantity((prev) => Math.min(prev + 1, cap))
                  }}
                  disabled={(() => {
                    const stockRemaining = stockQuantity - existingInCart
                    const cap =
                      remainingMax !== undefined
                        ? Math.min(remainingMax, stockRemaining)
                        : stockRemaining
                    return quantity >= cap
                  })()}
                >
                  +
                </Button>
              </HStack>
            </Box>
            <Button
              size="lg"
              disabled={!isInStock || !product.is_active}
              loading={addToCartMutation.isPending}
              onClick={handleAddToCart}
              w="100%"
            >
              {!isInStock
                ? "Out of Stock"
                : !product.is_active
                  ? "Unavailable"
                  : "Add to Cart"}
            </Button>
            <Text fontSize="xs" color="fg.muted" textAlign="center">
              In cart: {existingInCart}{" "}
              {maxQuantity
                ? `(remaining max: ${Math.max(0, maxQuantity - existingInCart)})`
                : ""}
            </Text>
          </VStack>
        </VStack>
      </SimpleGrid>

      {/* Reviews Section */}
      <Box mt={12}>
        <ProductReviewsSection productId={product.id} />
      </Box>
    </PageContainer>
  )
}
