// Deprecated order hooks replaced by direct component-level fetch logic.
export function useBuyerOrders() {
  return { data: { data: [], count: 0 }, isLoading: false }
}
export function useSellerOrders() {
  return { data: { data: [], count: 0 }, isLoading: false }
}
export function useOrder() {
  return { data: null, isLoading: false }
}
export function useUpdateOrderStatus() {
  return { mutate: () => undefined, isPending: false }
}
