import { useMutation } from "@tanstack/react-query"
import { ProductsService } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"

export const useCloneProduct = () => {
  const { showErrorToast, showSuccessToast } = useCustomToast()

  return useMutation({
    mutationKey: ["products", "clone"],
    mutationFn: async (orderItemId: string) => {
      const res = await ProductsService.cloneProduct({
        orderItemId,
      })
      return res
    },
    onError: (error: any) => {
      const detail =
        error?.body?.detail || error?.message || "Failed to clone product"
      showErrorToast(detail)
    },
    onSuccess: () => {
      showSuccessToast("Product cloned successfully")
    },
  })
}

export default useCloneProduct
