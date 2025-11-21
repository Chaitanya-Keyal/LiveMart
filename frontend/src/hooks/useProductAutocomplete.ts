import { useQuery } from "@tanstack/react-query"
import { ProductsService } from "@/client"

export const fetchProductAutocomplete = async (
  query: string,
  limit = 8,
  extraParams?: Record<string, any>,
): Promise<string[]> => {
  const params: any = {
    q: query,
    limit,
  }

  if (extraParams) {
    if (extraParams.seller_type) params.sellerType = extraParams.seller_type
    if (extraParams.category) params.category = extraParams.category
    if (extraParams.is_active !== undefined)
      params.isActive = extraParams.is_active
  }

  return ProductsService.autocompleteProducts(params)
}

export const useProductAutocomplete = (
  query: string,
  options?: { enabled?: boolean; limit?: number },
) => {
  const enabled = options?.enabled ?? true
  const limit = options?.limit ?? 8
  return useQuery<string[]>({
    queryKey: ["product-autocomplete", query, limit],
    queryFn: () => fetchProductAutocomplete(query, limit),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 60_000,
  })
}

export default useProductAutocomplete
