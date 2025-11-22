import { Button, Heading, HStack, Spinner, Stack, Text } from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { OrdersService } from "@/client"
import { OrderStatusBadge } from "@/components/Orders/OrderStatusBadge"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/seller/orders")({
  component: SellerOrdersPage,
})

const nextStatusMap: Record<string, string[]> = {
  pending: ["confirmed"],
  confirmed: ["preparing"],
  preparing: ["ready_to_ship"],
}

function SellerOrdersPage() {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const { data: orders, isLoading } = useQuery({
    queryKey: ["seller-orders"],
    queryFn: () => OrdersService.sellerOrders(),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      OrdersService.updateStatus({ orderId: id, status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] })
      showSuccessToast("Status updated")
    },
    onError: (e: any) => showErrorToast(e?.message || "Update failed"),
  })

  return (
    <Stack mt={6} gap={6}>
      <Heading size="md">Seller Orders</Heading>
      {isLoading && <Spinner />}
      {orders && orders.data.length === 0 && <Text>No orders yet.</Text>}
      {orders && orders.data.length > 0 && (
        <Stack gap={3}>
          {orders.data.map((o: any) => (
            <Stack key={o.id} borderWidth="1px" rounded="md" p={3} gap={2}>
              <HStack justify="space-between">
                <Link to={"/orders/$orderId"} params={{ orderId: o.id }}>
                  {o.order_number}
                </Link>
                <OrderStatusBadge status={o.order_status} />
              </HStack>
              <HStack justify="space-between" fontSize="xs" color="fg.muted">
                <Text>₹{o.order_total}</Text>
                <HStack gap={2}>
                  {nextStatusMap[o.order_status]?.map((st) => (
                    <Button
                      key={st}
                      size="xs"
                      colorScheme="teal"
                      onClick={() =>
                        updateStatusMutation.mutate({ id: o.id, status: st })
                      }
                      loading={updateStatusMutation.isPending}
                    >
                      {st.replace(/_/g, " ")}
                    </Button>
                  ))}
                  {o.order_status === "ready_to_ship" && (
                    <Text fontSize="xs" color="fg.subtle">
                      Awaiting delivery claim
                    </Text>
                  )}
                </HStack>
              </HStack>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
