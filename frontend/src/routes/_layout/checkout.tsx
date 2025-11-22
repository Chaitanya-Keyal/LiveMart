import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import type { OrderPublic, PaymentPublic } from "@/client/types.gen"
import { PageContainer } from "@/components/Common/PageContainer"
import { RazorpayPayButton } from "@/components/Payments/RazorpayPayButton"
import useAddresses from "@/hooks/useAddresses"
import { useCheckout } from "@/hooks/useCheckout"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/checkout")({
  component: CheckoutPage,
})

function CheckoutPage() {
  const [payment, setPayment] = useState<PaymentPublic | null>(null)
  const [orders, setOrders] = useState<OrderPublic[]>([])
  const { mutateAsync: checkoutMutateAsync, isError, error } = useCheckout()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { addresses, isLoading: addressesLoading } = useAddresses()
  const navigate = useNavigate()
  const hasPrepared = useRef(false)

  const prepare = useCallback(async () => {
    if (hasPrepared.current) return
    hasPrepared.current = true
    try {
      const data = await checkoutMutateAsync({})
      setPayment(data.payment as PaymentPublic)
      setOrders(data.orders as OrderPublic[])
      showSuccessToast("Orders prepared. Proceed to pay.")
    } catch (e: any) {
      showErrorToast(e?.message || "Checkout failed")
    }
  }, [checkoutMutateAsync, showSuccessToast, showErrorToast])

  useEffect(() => {
    if (!addressesLoading && addresses.length > 0) {
      void prepare()
    }
  }, [prepare, addressesLoading, addresses.length])

  if (!addressesLoading && addresses.length === 0) {
    return (
      <PageContainer variant="narrow">
        <VStack gap={8} py={20} align="center">
          <Box fontSize="6xl">📍</Box>
          <VStack gap={3}>
            <Heading size="xl">No Delivery Address</Heading>
            <Text textAlign="center" color="fg.muted" fontSize="lg" maxW="md">
              Please add a delivery address before checking out.
            </Text>
          </VStack>
          <Button size="lg" onClick={() => navigate({ to: "/settings" })}>
            Add Address
          </Button>
        </VStack>
      </PageContainer>
    )
  }

  if (!payment) {
    if (isError) {
      return (
        <PageContainer variant="narrow">
          <VStack gap={8} py={20} align="center">
            <Heading size="lg" color="danger.solid">
              Checkout Failed
            </Heading>
            <Text color="fg.muted" fontSize="lg" textAlign="center">
              {(error as any)?.message || "Something went wrong"}
            </Text>
            <Button size="lg" onClick={() => navigate({ to: "/cart" })}>
              Back to Cart
            </Button>
          </VStack>
        </PageContainer>
      )
    }

    return (
      <PageContainer variant="narrow">
        <Center py={20} flexDirection="column" gap={4}>
          <Spinner size="xl" />
          <Text color="fg.muted" fontSize="lg">
            Preparing your order...
          </Text>
        </Center>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="narrow">
      <VStack gap={8} align="stretch">
        <Heading size="xl">Checkout</Heading>
        <Box
          borderWidth="1px"
          borderColor="border.default"
          rounded="lg"
          p={6}
          bg="bg.surface"
        >
          <VStack gap={6} align="stretch">
            <Heading size="md">Order Summary</Heading>
            <Stack gap={3}>
              <Text fontSize="sm" color="fg.muted" fontWeight="600">
                ORDERS
              </Text>
              {orders.map((o) => (
                <HStack
                  key={o.id}
                  justify="space-between"
                  borderWidth="1px"
                  borderColor="border.default"
                  rounded="md"
                  p={3}
                  bg="bg.subtle"
                >
                  <Text fontWeight="500">{o.order_number}</Text>
                  <Text fontWeight="600">₹{o.order_total}</Text>
                </HStack>
              ))}
            </Stack>
            <Box pt={4} borderTopWidth="2px" borderTopColor="border.default">
              <HStack justify="space-between">
                <Text fontSize="xl" fontWeight="700">
                  Grand Total:
                </Text>
                <Text fontSize="2xl" fontWeight="700" color="brand.primary">
                  ₹{payment.total_amount}
                </Text>
              </HStack>
            </Box>
          </VStack>
        </Box>
        <RazorpayPayButton
          orderId={payment.razorpay_order_id || ""}
          amount={Number(payment.total_amount)}
          onSuccess={() => {
            showSuccessToast("Payment successful")
            navigate({ to: "/" })
          }}
          onError={() => showErrorToast("Payment failed")}
        />
      </VStack>
    </PageContainer>
  )
}
