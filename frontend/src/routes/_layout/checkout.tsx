import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import type { OrderPublic, PaymentPublic } from "@/client/types.gen"
import { RazorpayPayButton } from "@/components/Payments/RazorpayPayButton"
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
      hasPrepared.current = false // Allow retry
      showErrorToast(e?.message || "Checkout failed")
    }
  }, [checkoutMutateAsync, showSuccessToast, showErrorToast])

  useEffect(() => {
    void prepare()
  }, [prepare])

  if (!payment) {
    if (isError) {
      return (
        <Stack mt={6} gap={6} align="center">
          <Heading size="md" color="red.500">
            Checkout Failed
          </Heading>
          <Text>{(error as any)?.message || "Something went wrong"}</Text>
          <Button
            onClick={() => {
              hasPrepared.current = false
              void prepare()
            }}
            colorScheme="teal"
          >
            Retry
          </Button>
        </Stack>
      )
    }

    return (
      <Center mt={10} flexDirection="column" gap={4}>
        <Spinner size="xl" />
        <Text>Preparing your order...</Text>
      </Center>
    )
  }

  return (
    <Stack mt={6} gap={6}>
      <Heading size="md">Checkout</Heading>
      <Stack gap={4}>
        <Heading size="sm">Order Summary</Heading>
        <Stack gap={2} fontSize="sm">
          <Heading size="xs">Orders</Heading>
          {orders.map((o) => (
            <HStack
              key={o.id}
              justify="space-between"
              borderWidth="1px"
              rounded="md"
              p={2}
            >
              <Text>{o.order_number}</Text>
              <Text>₹{o.order_total}</Text>
            </HStack>
          ))}
        </Stack>
        <Box>
          <Text fontWeight="semibold">
            Grand Total: ₹{payment.total_amount}
          </Text>
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
      </Stack>
    </Stack>
  )
}
