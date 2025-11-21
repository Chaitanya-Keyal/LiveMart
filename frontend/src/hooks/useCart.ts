import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CartService } from "@/client"
import type {
  CartItemCreate,
  CartItemUpdate,
  CartPublic,
} from "@/client/types.gen"

export function useCart() {
  const qc = useQueryClient()
  const cartQuery = useQuery<CartPublic>({
    queryKey: ["cart"],
    queryFn: () => CartService.getCart().then((r) => r as CartPublic),
  })

  const addItem = useMutation({
    mutationFn: (item: CartItemCreate) =>
      CartService.addItem({ requestBody: item }).then((r) => r as CartPublic),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  })

  const updateItem = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      CartService.updateItem({
        cartItemId: id,
        requestBody: { quantity } as CartItemUpdate,
      }).then((r) => r as CartPublic),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  })

  const removeItem = useMutation({
    mutationFn: (id: string) =>
      CartService.removeItem({ cartItemId: id }).then((r) => r as CartPublic),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  })

  const clearCart = useMutation({
    mutationFn: () => CartService.clearCart().then((r) => r as CartPublic),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  })

  return { cartQuery, addItem, updateItem, removeItem, clearCart }
}
