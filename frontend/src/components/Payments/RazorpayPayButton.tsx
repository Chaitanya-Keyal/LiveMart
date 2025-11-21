import { Button } from "@chakra-ui/react"
import { useEffect, useState } from "react"

declare global {
  interface Window {
    Razorpay: any
  }
}

interface Props {
  orderId: string
  amount: number
  currency?: string
  onSuccess: (payload: any) => void
  onError?: (e: any) => void
}

export function RazorpayPayButton({
  orderId,
  amount,
  currency = "INR",
  onSuccess,
  onError,
}: Props) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (window.Razorpay) {
      setReady(true)
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => setReady(true)
    script.onerror = () => setReady(false)
    document.body.appendChild(script)
  }, [])

  const key = import.meta.env.VITE_RAZORPAY_KEY_ID

  return (
    <Button
      size="md"
      variant="solid"
      colorScheme="teal"
      disabled={!ready}
      onClick={() => {
        if (!window.Razorpay) return
        const rzp = new window.Razorpay({
          key,
          order_id: orderId,
          amount: amount * 100,
          currency,
          handler: (resp: any) => onSuccess(resp),
          modal: { ondismiss: () => onError?.({ dismissed: true }) },
          theme: { color: "#009688" },
        })
        try {
          rzp.open()
        } catch (e) {
          onError?.(e)
        }
      }}
    >
      Pay Now
    </Button>
  )
}
