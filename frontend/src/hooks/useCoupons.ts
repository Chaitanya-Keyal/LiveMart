import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  type ApiError,
  type CouponCreate,
  type CouponPublic,
  type CouponsPublic,
  CouponsService,
  type CouponUpdate,
  type CouponValidateRequest,
  type CouponValidateResponse,
} from "@/client"
import { handleError } from "@/utils"

export const useCoupons = (skip = 0, limit = 100) => {
  const queryClient = useQueryClient()

  const { data: coupons, isLoading } = useQuery<CouponsPublic, Error>({
    queryKey: ["coupons", skip, limit],
    queryFn: () => CouponsService.readCoupons({ skip, limit }),
  })

  const createCouponMutation = useMutation({
    mutationFn: (data: CouponCreate) =>
      CouponsService.createCoupon({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CouponUpdate }) =>
      CouponsService.updateCoupon({ couponId: id, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => CouponsService.deleteCoupon({ couponId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return {
    coupons,
    isLoading,
    createCoupon: createCouponMutation.mutate,
    updateCoupon: updateCouponMutation.mutate,
    deleteCoupon: deleteCouponMutation.mutate,
    isCreating: createCouponMutation.isPending,
    isUpdating: updateCouponMutation.isPending,
    isDeleting: deleteCouponMutation.isPending,
  }
}

export const useFeaturedCoupons = () => {
  const { data: coupons, isLoading } = useQuery<CouponPublic[], Error>({
    queryKey: ["coupons", "featured"],
    queryFn: () => CouponsService.getFeaturedCoupons(),
  })

  return {
    coupons,
    isLoading,
  }
}

export const useValidateCoupon = () => {
  const validateCouponMutation = useMutation<
    CouponValidateResponse,
    ApiError,
    CouponValidateRequest
  >({
    mutationFn: (data: CouponValidateRequest) =>
      CouponsService.validateCoupon({ requestBody: data }),
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return {
    validateCoupon: validateCouponMutation.mutate,
    validateCouponAsync: validateCouponMutation.mutateAsync,
    isValidating: validateCouponMutation.isPending,
    validationResult: validateCouponMutation.data,
    validationError: validateCouponMutation.error,
  }
}
