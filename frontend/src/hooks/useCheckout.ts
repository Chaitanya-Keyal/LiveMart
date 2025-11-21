import { useMutation, useQueryClient } from "@tanstack/react-query"
import { OrdersService } from "@/client"
import type { CheckoutRequest, CheckoutResponse } from "@/client/types.gen"

export function useCheckout() {
  const qc = useQueryClient()
  return useMutation<CheckoutResponse, any, CheckoutRequest | undefined>({
    mutationFn: (body) =>
      OrdersService.checkout({ requestBody: (body || {}) as any }).then(
        (r) => r as CheckoutResponse,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] })
      qc.invalidateQueries({ queryKey: ["orders", "me"] })
    },
  })
}
