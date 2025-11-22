import { Button, Flex, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { FaPlus } from "react-icons/fa"
import { PageContainer } from "@/components/Common/PageContainer"
import { InventoryTable } from "@/components/Retailer/InventoryTable"
import useAuth from "@/hooks/useAuth"

export const SellPage = () => {
  const { user, activeRole } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const isRetailer = activeRole === "retailer"
  const isWholesaler = activeRole === "wholesaler"

  const heading = isRetailer ? "My Products" : "Wholesale Catalog"

  return (
    <PageContainer variant="list">
      <VStack align="stretch" gap={8}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <VStack align="start" gap={1}>
            <Heading size="xl">{heading}</Heading>
            <Text color="fg.muted" fontSize="md">
              Manage your product inventory
            </Text>
          </VStack>
          <HStack gap={3}>
            {isWholesaler && (
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate({ to: "/sell/bulk" })}
              >
                Bulk Upload
              </Button>
            )}
            <Button size="md" onClick={() => navigate({ to: "/sell/new" })}>
              <FaPlus fontSize="16px" />
              Add Product
            </Button>
          </HStack>
        </Flex>
        {isRetailer && (
          <InventoryTable
            sellerType="retailer"
            sellerId={user?.id}
            page={page}
            onPageChange={setPage}
          />
        )}
        {isWholesaler && (
          <InventoryTable
            sellerType="wholesaler"
            sellerId={user?.id}
            page={page}
            onPageChange={setPage}
          />
        )}
      </VStack>
    </PageContainer>
  )
}
