import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Separator,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import React from "react"
import type { ProductPublic } from "@/client"
import useAuth from "@/hooks/useAuth"
import { formatPrice } from "@/utils"
import { getAllProductImageUrls, getPrimaryImageUrl } from "@/utils/images"

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

  // Determine buyer type based on active role
  const buyerType = activeRole === "retailer" ? "retailer" : "customer"

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

  const imageUrls = getAllProductImageUrls(product)
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0)

  const stockQuantity = product.inventory?.stock_quantity || 0
  const lowStockThreshold = product.inventory?.low_stock_threshold || 10
  const isInStock = stockQuantity > 0
  const isLowStock = stockQuantity > 0 && stockQuantity < lowStockThreshold

  return (
    <Container maxW="6xl" py={8}>
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
        {/* Image Gallery */}
        <Box>
          <Box
            w="100%"
            aspectRatio="1"
            mb={4}
            borderRadius="md"
            overflow="hidden"
            bg="gray.100"
          >
            <Image
              src={imageUrls[selectedImageIndex] || getPrimaryImageUrl(product)}
              alt={product.name}
              w="100%"
              h="100%"
              objectFit="cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "https://via.placeholder.com/600x600?text=No+Image"
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
                    selectedImageIndex === index ? "blue.500" : "gray.200"
                  }
                  onClick={() => setSelectedImageIndex(index)}
                  _hover={{ borderColor: "blue.300" }}
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
              <Badge colorPalette="blue" variant="subtle">
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
            {product.description && (
              <Text color="gray.600" fontSize="md">
                {product.description}
              </Text>
            )}
          </Box>

          <Separator />

          <Box>
            <Text fontSize="3xl" fontWeight="bold" color="blue.600" mb={2}>
              {formatPrice(price)}
            </Text>
            {minQuantity > 1 && (
              <Text fontSize="sm" color="gray.600">
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
              <Badge
                colorPalette={isLowStock ? "orange" : "green"}
                variant="subtle"
                fontSize="md"
              >
                {isLowStock
                  ? `Low Stock (${stockQuantity} remaining)`
                  : `In Stock (${stockQuantity} available)`}
              </Badge>
            ) : (
              <Badge colorPalette="red" variant="subtle" fontSize="md">
                Out of Stock
              </Badge>
            )}
          </Box>

          {product.sku && (
            <Box>
              <Text fontWeight="semibold" mb={1}>
                SKU:
              </Text>
              <Text fontSize="sm" color="gray.600">
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

          <Box>
            <Button
              size="lg"
              colorPalette="blue"
              disabled={!isInStock || !product.is_active}
              w="100%"
            >
              {!isInStock
                ? "Out of Stock"
                : !product.is_active
                  ? "Unavailable"
                  : "Add to Cart"}
            </Button>
            <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
              Cart functionality coming soon
            </Text>
          </Box>
        </VStack>
      </SimpleGrid>
    </Container>
  )
}
