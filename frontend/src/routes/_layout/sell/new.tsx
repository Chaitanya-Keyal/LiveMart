import { Box, Heading, Text, VStack } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import type { UserPublic } from "@/client"
import PageContainer from "@/components/Common/PageContainer"
import { ProductForm } from "@/components/Retailer/ProductForm"

export const Route = createFileRoute("/_layout/sell/new")({
  component: SellNewProductPage,
})

function SellNewProductPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
    const role = currentUser?.active_role
    if (!currentUser || (role !== "retailer" && role !== "wholesaler")) {
      navigate({
        to: "/",
        search: { error: "Sell page is for retailers and wholesalers" },
      })
    }
  }, [queryClient, navigate])

  return (
    <PageContainer variant="form">
      <VStack align="start" gap={8} w="100%">
        <Box>
          <Heading size="xl" mb={2}>
            Add New Product
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            Create a new product listing
          </Text>
        </Box>
        <ProductForm
          onSuccess={() => navigate({ to: "/sell" })}
          onCancel={() => navigate({ to: "/sell" })}
        />
      </VStack>
    </PageContainer>
  )
}
