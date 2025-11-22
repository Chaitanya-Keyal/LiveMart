import {
  Badge,
  Box,
  Button,
  Center,
  Grid,
  Heading,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { FaTag, FaTimes } from "react-icons/fa"
import type { OrderPublic, PaymentPublic } from "@/client/types.gen"
import { PageContainer } from "@/components/Common/PageContainer"
import { RazorpayPayButton } from "@/components/Payments/RazorpayPayButton"
import { Field } from "@/components/ui/field"
import useAddresses from "@/hooks/useAddresses"
import { useCheckout } from "@/hooks/useCheckout"
import { useFeaturedCoupons, useValidateCoupon } from "@/hooks/useCoupons"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/checkout")({
  component: CheckoutPage,
})

function CheckoutPage() {
  const queryClient = useQueryClient()
  const [payment, setPayment] = useState<PaymentPublic | null>(null)
  const [orders, setOrders] = useState<OrderPublic[]>([])
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [discount, setDiscount] = useState(0)
  const { mutateAsync: checkoutMutateAsync, isError, error } = useCheckout()
  const { validateCouponAsync, isValidating } = useValidateCoupon()
  const { coupons: featuredCoupons, isLoading: featuredLoading } =
    useFeaturedCoupons()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { addresses, isLoading: addressesLoading } = useAddresses()
  const navigate = useNavigate()
  const hasPrepared = useRef(false)

  const prepare = useCallback(
    async (coupon?: string) => {
      if (hasPrepared.current && !coupon) return
      hasPrepared.current = true
      try {
        const data = await checkoutMutateAsync({
          coupon_code: coupon || null,
        })
        setPayment(data.payment as PaymentPublic)
        setOrders(data.orders as OrderPublic[])
        if (!coupon) {
          showSuccessToast("Orders prepared. Proceed to pay.")
        }
      } catch (e: any) {
        showErrorToast(e?.message || "Checkout failed")
        // Reset if coupon failed
        if (coupon) {
          setAppliedCoupon(null)
          setDiscount(0)
          hasPrepared.current = false
        }
      }
    },
    [checkoutMutateAsync, showSuccessToast, showErrorToast],
  )

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return

    try {
      const result = await validateCouponAsync({
        code: couponCode.trim().toUpperCase(),
        cart_total: payment?.total_amount || "0",
      })

      if (result.valid && result.discount_amount) {
        setAppliedCoupon(couponCode.trim().toUpperCase())
        setDiscount(Number(result.discount_amount))
        showSuccessToast(`Coupon applied! You save ₹${result.discount_amount}`)
        // Re-prepare checkout with coupon
        hasPrepared.current = false
        await prepare(couponCode.trim().toUpperCase())
      } else {
        showErrorToast(result.message || "Invalid coupon")
      }
    } catch (e: any) {
      showErrorToast(e?.message || "Failed to validate coupon")
    }
  }

  const handleRemoveCoupon = async () => {
    setAppliedCoupon(null)
    setDiscount(0)
    setCouponCode("")
    hasPrepared.current = false
    await prepare()
  }

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

        {/* Coupon Section */}
        <Box
          borderWidth="1px"
          borderColor="border.default"
          rounded="lg"
          p={6}
          bg="bg.surface"
        >
          <VStack gap={4} align="stretch">
            <Heading size="md">
              <FaTag style={{ display: "inline", marginRight: "8px" }} />
              Apply Coupon
            </Heading>

            {appliedCoupon ? (
              <HStack
                justify="space-between"
                p={3}
                bg="green.50"
                borderColor="green.500"
                borderWidth="1px"
                rounded="md"
              >
                <VStack align="start" gap={1}>
                  <Text fontWeight="600" color="green.700">
                    {appliedCoupon}
                  </Text>
                  <Text fontSize="sm" color="green.600">
                    You save ₹{discount.toFixed(2)}
                  </Text>
                </VStack>
                <Button
                  size="sm"
                  variant="ghost"
                  colorPalette="red"
                  onClick={handleRemoveCoupon}
                >
                  <FaTimes />
                  Remove
                </Button>
              </HStack>
            ) : (
              <>
                <HStack>
                  <Field flex={1}>
                    <Input
                      value={couponCode}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      placeholder="Enter coupon code"
                      textTransform="uppercase"
                    />
                  </Field>
                  <Button
                    onClick={handleApplyCoupon}
                    loading={isValidating}
                    disabled={!couponCode.trim()}
                  >
                    Apply
                  </Button>
                </HStack>

                {/* Featured Coupons */}
                {!featuredLoading &&
                  featuredCoupons &&
                  featuredCoupons.length > 0 && (
                    <VStack align="stretch" gap={2}>
                      <Text fontSize="sm" fontWeight="600" color="fg.muted">
                        AVAILABLE COUPONS
                      </Text>
                      <Grid
                        templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                        gap={3}
                      >
                        {featuredCoupons.map((coupon) => (
                          <Box
                            key={coupon.id}
                            borderWidth="1px"
                            borderColor="border.emphasized"
                            rounded="md"
                            p={3}
                            bg="bg.subtle"
                            cursor="pointer"
                            _hover={{
                              borderColor: "brand.solid",
                              bg: "bg.muted",
                            }}
                            onClick={() => {
                              setCouponCode(coupon.code)
                            }}
                          >
                            <HStack justify="space-between" mb={2}>
                              <Text
                                fontWeight="700"
                                fontSize="lg"
                                fontFamily="mono"
                              >
                                {coupon.code}
                              </Text>
                              <Badge colorPalette="green">
                                {coupon.discount_type === "percentage"
                                  ? `${coupon.discount_value}% OFF`
                                  : `₹${coupon.discount_value} OFF`}
                              </Badge>
                            </HStack>
                            {coupon.min_order_value && (
                              <Text fontSize="xs" color="fg.subtle">
                                Min. order: ₹{coupon.min_order_value}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </Grid>
                    </VStack>
                  )}
              </>
            )}
          </VStack>
        </Box>

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

            {discount > 0 && (
              <HStack
                justify="space-between"
                pt={2}
                color="green.600"
                fontWeight="600"
              >
                <Text>Coupon Discount:</Text>
                <Text>- ₹{discount.toFixed(2)}</Text>
              </HStack>
            )}

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
            // Invalidate cart to update badge immediately
            queryClient.invalidateQueries({ queryKey: ["cart"] })
            showSuccessToast("Payment successful")
            navigate({ to: "/" })
          }}
          onError={() => showErrorToast("Payment failed")}
        />
      </VStack>
    </PageContainer>
  )
}
