import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  type ApiError,
  type PaymentSettlementCreate,
  type PaymentSettlementPublic,
  type PaymentSettlementsPublic,
  PaymentsService,
} from "@/client"
import { handleError } from "@/utils"

export const usePendingSettlements = () => {
  const { data, isLoading } = useQuery<Record<string, unknown>, Error>({
    queryKey: ["settlements", "pending"],
    queryFn: () => PaymentsService.getPendingSettlements(),
  })

  return {
    pendingSettlements: data,
    isLoading,
  }
}

export const useSettlementHistory = (
  userId?: string | null,
  skip = 0,
  limit = 100,
) => {
  const { data: settlements, isLoading } = useQuery<
    PaymentSettlementsPublic,
    Error
  >({
    queryKey: ["settlements", "history", userId, skip, limit],
    queryFn: () =>
      PaymentsService.getSettlementHistory({ userId, skip, limit }),
  })

  return {
    settlements,
    isLoading,
  }
}

export const useSettlementById = (settlementId: string | null) => {
  const { data, isLoading, error } = useQuery<Record<string, unknown>, Error>({
    queryKey: ["settlements", settlementId],
    queryFn: () =>
      PaymentsService.getSettlement({ settlementId: settlementId! }),
    enabled: !!settlementId && settlementId.trim() !== "",
    retry: false,
  })

  return {
    settlement: data?.settlement as PaymentSettlementPublic | undefined,
    orders: data?.orders as unknown[] | undefined,
    isLoading,
    error,
  }
}

export const useCreateSettlement = () => {
  const queryClient = useQueryClient()

  const createSettlementMutation = useMutation({
    mutationFn: (data: PaymentSettlementCreate) =>
      PaymentsService.createSettlement({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return {
    createSettlement: createSettlementMutation.mutate,
    createSettlementAsync: createSettlementMutation.mutateAsync,
    isCreating: createSettlementMutation.isPending,
  }
}
