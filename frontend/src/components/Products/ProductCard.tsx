import {
  Badge,
  Box,
  Card,
  Flex,
  HStack,
  Icon,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Link as RouterLink } from "@tanstack/react-router"
import { FiMapPin } from "react-icons/fi"
import type { ProductPublic } from "@/client"
import useAuth from "@/hooks/useAuth"
import { formatPrice } from "@/utils"
import { getPrimaryImageUrl } from "@/utils/images"

interface ProductCardProps {
  product: ProductPublic
}

const getCategoryLabel = (category: string): string => {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const getStockStatus = (
  stockQuantity?: number,
  lowStockThreshold?: number,
): { label: string; color: string } => {
  if (!stockQuantity || stockQuantity === 0) {
    return { label: "Out of Stock", color: "red" }
  }
  if (lowStockThreshold && stockQuantity < lowStockThreshold) {
    return { label: "Low Stock", color: "orange" }
  }
  return { label: "In Stock", color: "green" }
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { activeRole } = useAuth()
  const primaryImageUrl = getPrimaryImageUrl(product)

  // Determine buyer type based on active role
  // Retailers viewing wholesaler products should see retailer pricing
  const buyerType = activeRole === "retailer" ? "retailer" : "customer"

  // Get pricing tier for current buyer type, fallback to customer pricing
  const pricingTier = product.pricing_tiers?.find(
    (tier) => tier.buyer_type === buyerType && tier.is_active,
  )
  const fallbackPricing = product.pricing_tiers?.find(
    (tier) => tier.buyer_type === "customer" && tier.is_active,
  )
  const price = pricingTier?.price || fallbackPricing?.price || "0"

  const stockStatus = getStockStatus(
    product.inventory?.stock_quantity,
    product.inventory?.low_stock_threshold,
  )

  const isLocal = product.tags?.includes("local") || false
  const distanceKm = (product as any).distance_km as number | undefined

  return (
    <Card.Root
      asChild
      size="sm"
      variant="outline"
      _hover={{ shadow: "md", transform: "translateY(-2px)" }}
      transition="all 0.2s"
    >
      <RouterLink to="/buy/$productId" params={{ productId: product.id }}>
        <Card.Body p={0}>
          <Box position="relative" w="100%" aspectRatio="1" overflow="hidden">
            <Image
              src={primaryImageUrl}
              alt={product.name}
              objectFit="cover"
              w="100%"
              h="100%"
              loading="lazy"
              onError={(e) => {
                // Fallback to placeholder on error
                const target = e.target as HTMLImageElement
                target.src = "https://via.placeholder.com/400x400?text=No+Image"
              }}
            />
            {isLocal && (
              <Badge
                position="absolute"
                top={2}
                left={2}
                colorPalette="green"
                variant="solid"
              >
                Local Product
              </Badge>
            )}
            {!product.is_active && (
              <Badge
                position="absolute"
                top={2}
                right={2}
                colorPalette="gray"
                variant="solid"
              >
                Unavailable
              </Badge>
            )}
          </Box>
          <Card.Body p={4}>
            <VStack align="stretch" gap={3}>
              <Badge
                colorPalette="blue"
                variant="subtle"
                alignSelf="flex-start"
                fontSize="xs"
              >
                {getCategoryLabel(product.category)}
              </Badge>
              <Text
                fontWeight="semibold"
                fontSize="md"
                lineClamp={2}
                minH="2.5rem"
              >
                {product.name}
              </Text>
              {distanceKm != null && (
                <HStack gap={1} color="gray.600" fontSize="sm">
                  <Icon as={FiMapPin} />
                  <Text>{distanceKm.toFixed(1)} km away</Text>
                </HStack>
              )}
              {product.description && (
                <Text
                  fontSize="sm"
                  color="gray.600"
                  lineClamp={2}
                  minH="2.5rem"
                >
                  {product.description}
                </Text>
              )}
              <Flex justify="space-between" align="center" mt="auto">
                <Text fontSize="xl" fontWeight="bold" color="blue.600">
                  {formatPrice(price)}
                </Text>
                <Badge
                  colorPalette={stockStatus.color}
                  variant="subtle"
                  fontSize="xs"
                >
                  {stockStatus.label}
                </Badge>
              </Flex>
            </VStack>
          </Card.Body>
        </Card.Body>
      </RouterLink>
    </Card.Root>
  )
}
