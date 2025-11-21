import { useQueries } from "@tanstack/react-query"
import { type ProductPublic, ProductsService } from "@/client"

export const useProductsByIds = (ids: string[]) => {
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["product", id],
      queryFn: () => ProductsService.getProduct({ productId: id }),
      enabled: !!id,
      staleTime: 30_000,
    })),
  })

  const loading = queries.some((q) => q.isPending)
  const productsMap: Record<string, ProductPublic> = {}
  queries.forEach((q, idx) => {
    const data = q.data as ProductPublic | undefined
    if (data) productsMap[ids[idx]] = data
  })
  return { productsMap, loading }
}

export default useProductsByIds
