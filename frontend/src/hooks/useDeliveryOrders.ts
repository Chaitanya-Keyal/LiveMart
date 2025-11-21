// Deprecated hooks stubbed out to avoid compile errors.
export function useAvailableDeliveries() {
  return { data: { data: [], count: 0 }, isLoading: false }
}
export function useClaimDelivery() {
  return { mutate: () => undefined, isPending: false }
}
