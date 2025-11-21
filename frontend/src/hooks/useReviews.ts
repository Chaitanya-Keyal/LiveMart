import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
  ApiError,
  ReviewCreate,
  ReviewsPublic,
  ReviewUpdate,
} from "@/client"
import { OrdersService, ReviewsService } from "@/client"
import useCustomToast from "./useCustomToast"

const invalidateReviewQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["reviews", productId] }),
    queryClient.invalidateQueries({ queryKey: ["products"] }),
    queryClient.invalidateQueries({ queryKey: ["product", productId] }),
  ])
}

interface UseProductReviewsOptions {
  productId: string
  skip?: number
  limit?: number
  sort?: "newest" | "rating_desc" | "rating_asc"
}

export const useProductReviews = (options: UseProductReviewsOptions) => {
  const { data, isPending, error } = useQuery<ReviewsPublic, ApiError>({
    queryKey: ["reviews", options.productId, options],
    queryFn: () =>
      ReviewsService.getProductReviews({
        productId: options.productId,
        skip: options.skip ?? 0,
        limit: options.limit ?? 50,
        sort: options.sort ?? "newest",
      }),
    staleTime: 30_000,
  })

  return {
    reviews: data?.data ?? [],
    count: data?.count ?? 0,
    isPending,
    error,
  }
}

export const useCreateReview = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (data: { productId: string; review: ReviewCreate }) =>
      ReviewsService.createProductReview({
        productId: data.productId,
        requestBody: data.review,
      }),
    onSuccess: (_data, variables) => {
      showSuccessToast("Review submitted successfully")
      invalidateReviewQueries(queryClient, variables.productId)
    },
    onError: (error: ApiError) => {
      const detail = (error.body as { detail?: string })?.detail
      showErrorToast(detail || "Failed to submit review")
    },
  })

  return mutation
}

export const useUpdateReview = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (data: {
      reviewId: string
      productId: string
      update: ReviewUpdate
    }) =>
      ReviewsService.updateProductReview({
        reviewId: data.reviewId,
        requestBody: data.update,
      }),
    onSuccess: (_data, variables) => {
      showSuccessToast("Review updated successfully")
      invalidateReviewQueries(queryClient, variables.productId)
    },
    onError: (error: ApiError) => {
      const detail = (error.body as { detail?: string })?.detail
      showErrorToast(detail || "Failed to update review")
    },
  })

  return mutation
}

export const useDeleteReview = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (data: { reviewId: string; productId: string }) =>
      ReviewsService.deleteProductReview({
        reviewId: data.reviewId,
      }),
    onSuccess: (_data, variables) => {
      showSuccessToast("Review deleted successfully")
      invalidateReviewQueries(queryClient, variables.productId)
    },
    onError: (error: ApiError) => {
      const detail = (error.body as { detail?: string })?.detail
      showErrorToast(detail || "Failed to delete review")
    },
  })

  return mutation
}

export const useHasPurchasedProduct = (productId: string, enabled = true) => {
  const { data, isPending } = useQuery({
    queryKey: ["hasPurchased", productId],
    queryFn: async () => {
      const orders = await OrdersService.myOrders({ limit: 100 })
      return orders.data.some((order) =>
        order.items?.some((item) => item.product_id === productId),
      )
    },
    enabled,
    staleTime: 60_000,
  })

  return {
    hasPurchased: data ?? false,
    isPending,
  }
}
