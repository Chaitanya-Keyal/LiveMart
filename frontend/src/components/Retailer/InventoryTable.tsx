import {
  Badge,
  Box,
  EmptyState,
  Flex,
  IconButton,
  Image,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Link, useNavigate } from "@tanstack/react-router"
import { FiEdit, FiSearch, FiTrash2 } from "react-icons/fi"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination"
import { useDeleteProduct, useProducts } from "@/hooks/useProducts"
import { formatPrice } from "@/utils"
import { getPrimaryImageUrl } from "@/utils/images"
import { StockUpdateDialog } from "./StockUpdateDialog"

interface InventoryTableProps {
  sellerType?: "retailer" | "wholesaler"
  sellerId?: string
  page?: number
  onPageChange?: (page: number) => void
}

const PER_PAGE = 10

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

export const InventoryTable = ({
  sellerType = "retailer",
  sellerId,
  page = 1,
  onPageChange,
}: InventoryTableProps) => {
  const navigate = useNavigate()
  const { products, count, isLoading } = useProducts({
    sellerId: sellerId || undefined,
    sellerType,
    skip: (page - 1) * PER_PAGE,
    limit: PER_PAGE,
  })

  const deleteProductMutation = useDeleteProduct()

  const handleDelete = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteProductMutation.mutateAsync(productId)
    }
  }

  if (isLoading) {
    return <Text>Loading...</Text>
  }

  if (products.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <FiSearch />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>No products found</EmptyState.Title>
            <EmptyState.Description>
              Create your first product to get started
            </EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  return (
    <>
      <Table.Root size={{ base: "sm", md: "md" }}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Image</Table.ColumnHeader>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Category</Table.ColumnHeader>
            <Table.ColumnHeader>SKU</Table.ColumnHeader>
            <Table.ColumnHeader>Stock</Table.ColumnHeader>
            <Table.ColumnHeader>Price</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {products.map((product) => {
            const targetBuyerType =
              sellerType === "wholesaler" ? "retailer" : "customer"
            const pricing = product.pricing_tiers?.find(
              (tier) => tier.buyer_type === targetBuyerType && tier.is_active,
            )
            const price = pricing?.price || "0"
            const stockStatus = getStockStatus(
              product.inventory?.stock_quantity,
              product.inventory?.low_stock_threshold,
            )

            return (
              <Table.Row
                key={product.id}
                cursor="pointer"
                _hover={{ background: "gray.subtle" }}
                onClick={() =>
                  navigate({
                    to: "/sell/$productId",
                    params: { productId: product.id },
                  })
                }
              >
                <Table.Cell>
                  <Box w="50px" h="50px" borderRadius="md" overflow="hidden">
                    <Image
                      src={getPrimaryImageUrl(product)}
                      alt={product.name}
                      w="100%"
                      h="100%"
                      objectFit="cover"
                    />
                  </Box>
                </Table.Cell>
                <Table.Cell>
                  <Text fontWeight="semibold" lineClamp={1}>
                    {product.name}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="subtle">
                    {getCategoryLabel(product.category)}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm" color="fg.muted">
                    {product.sku}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <VStack align="start" gap={1}>
                    <Badge colorPalette={stockStatus.color} variant="subtle">
                      {product.inventory?.stock_quantity || 0}
                    </Badge>
                    <Text fontSize="xs" color="fg.subtle">
                      {stockStatus.label}
                    </Text>
                  </VStack>
                </Table.Cell>
                <Table.Cell>
                  <Text fontWeight="semibold">{formatPrice(price)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    colorPalette={product.is_active ? "green" : "gray"}
                    variant="subtle"
                  >
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Flex gap={2}>
                    <Link
                      to="/sell/$productId"
                      params={{ productId: product.id }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Edit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FiEdit />
                      </IconButton>
                    </Link>
                    <Box onClick={(e) => e.stopPropagation()}>
                      <StockUpdateDialog product={product} />
                    </Box>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(product.id)
                      }}
                      aria-label="Delete"
                      loading={deleteProductMutation.isPending}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
      {count > PER_PAGE && onPageChange && (
        <Flex justifyContent="center" mt={6}>
          <PaginationRoot
            count={count}
            pageSize={PER_PAGE}
            page={page}
            onPageChange={({ page }) => onPageChange(page)}
          >
            <Flex gap={2} align="center">
              <PaginationPrevTrigger />
              <PaginationItems />
              <PaginationNextTrigger />
            </Flex>
          </PaginationRoot>
        </Flex>
      )}
    </>
  )
}
