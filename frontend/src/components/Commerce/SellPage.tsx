import { Button, Container, Flex, Heading } from "@chakra-ui/react"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { FaPlus } from "react-icons/fa"
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
    <Container maxW="full">
      <Flex justify="space-between" align="center" mb={6} pt={4}>
        <Heading size="lg">{heading}</Heading>
        <Flex gap={2}>
          {isWholesaler && (
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/sell/bulk" })}
            >
              Bulk Upload
            </Button>
          )}
          <Button onClick={() => navigate({ to: "/sell/new" })}>
            <FaPlus fontSize="16px" />
            Add Product
          </Button>
        </Flex>
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
    </Container>
  )
}
